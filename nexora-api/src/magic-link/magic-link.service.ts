import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { MagicLinkToken } from './entities/magic-link-token.entity';
import { ClientUser } from '../clients/entities/client-user.entity';
import { emailFetch } from '../common/email.utils';

@Injectable()
export class MagicLinkService {
  private readonly logger = new Logger(MagicLinkService.name);

  constructor(
    @InjectRepository(MagicLinkToken)
    private readonly tokenRepo: Repository<MagicLinkToken>,
    @InjectRepository(ClientUser)
    private readonly clientRepo: Repository<ClientUser>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateToken(clientId: string, email: string): Promise<string> {
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.tokenRepo.save({ clientId, token, email, expiresAt } as any);

    const apiUrl = this.configService.get('API_URL', 'http://localhost:3001');
    const magicLinkUrl = `${apiUrl}/auth/magic-link/verify?token=${token}`;

    await this.sendEmail(email, magicLinkUrl);

    return magicLinkUrl;
  }

  async verifyToken(token: string): Promise<{ clientId: string; email: string }> {
    const tokenEntity = await this.tokenRepo.findOne({
      where: { token, used: false, expiresAt: MoreThan(new Date()) },
    });

    if (!tokenEntity) {
      throw new UnauthorizedException('Lien invalide ou expiré');
    }

    tokenEntity.used = true;
    await this.tokenRepo.save(tokenEntity);

    const client = await this.clientRepo.findOne({ where: { id: tokenEntity.clientId } });
    if (!client) throw new UnauthorizedException('Client non trouvé');

    return { clientId: client.id, email: client.email };
  }

  async generateSessionToken(clientId: string, email: string): Promise<string> {
    return this.jwtService.sign(
      { sub: clientId, email, type: 'client' },
      { expiresIn: '7d' },
    );
  }

  private async sendEmail(to: string, magicLinkUrl: string): Promise<void> {
    const apiKey = this.configService.get('ZEZE_API_KEY');
    const projectId = this.configService.get('ZEZE_PROJECT_ID');

    if (!apiKey || !projectId) {
      this.logger.warn('ZEZE_API_KEY or ZEZE_PROJECT_ID not set — email not sent');
      this.logger.log(`Magic link for ${to}: ${magicLinkUrl}`);
      return;
    }

    try {
      const response = await emailFetch('https://quantumgateapi.fr/v1/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          projectId,
          from: 'noreply@zeze-innovation.com',
          to,
          subject: 'Accès à votre espace de rapports SEO',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">Votre accès Nexora</h2>
              <p>Cliquez sur le lien ci-dessous pour accéder à votre espace de rapports SEO :</p>
              <a href="${magicLinkUrl}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                Accéder à mon espace
              </a>
              <p style="color: #666; font-size: 12px;">Ce lien est valide pendant 24 heures.</p>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        this.logger.error(`Email send failed: ${response.status}`);
      }
    } catch (error) {
      this.logger.error(`Email send error: ${(error as Error).message}`);
    }
  }
}
