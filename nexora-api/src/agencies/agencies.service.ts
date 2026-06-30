import {
  Injectable, Logger, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { emailFetch } from '../common/email.utils';
import { Agency } from './entities/agency.entity';
import { AgencyMember } from './entities/agency-member.entity';
import { Project } from '../projects/entities/project.entity';
import { Report } from '../reports/entities/report.entity';
import { User } from '../users/entities/user.entity';
import { CreateAgencyDto, UpdateAgencyDto } from './dto/agency.dto';

@Injectable()
export class AgenciesService {
  private readonly logger = new Logger(AgenciesService.name);

  constructor(
    @InjectRepository(Agency)
    private readonly agencyRepo: Repository<Agency>,
    @InjectRepository(AgencyMember)
    private readonly memberRepo: Repository<AgencyMember>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async create(ownerUserId: string, dto: CreateAgencyDto): Promise<Agency> {
    const slug = dto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const agency = await this.agencyRepo.save({
      name: dto.name,
      slug,
      ownerUserId,
    });

    await this.memberRepo.save({
      agencyId: agency.id,
      userId: ownerUserId,
      role: 'owner',
    });

    return agency;
  }

  async findById(id: string): Promise<Agency> {
    const agency = await this.agencyRepo.findOne({ where: { id } });
    if (!agency) throw new NotFoundException('Agence non trouvée');
    return agency;
  }

  async findByOwner(ownerUserId: string): Promise<Agency[]> {
    return this.agencyRepo.find({ where: { ownerUserId }, order: { createdAt: 'DESC' } });
  }

  async findByMember(userId: string): Promise<Agency[]> {
    const memberships = await this.memberRepo.find({
      where: { userId },
      relations: ['agency'],
    });
    return memberships.map(m => m.agency);
  }

  async update(id: string, userId: string, dto: UpdateAgencyDto): Promise<Agency> {
    const agency = await this.findById(id);
    if (agency.ownerUserId !== userId) throw new ForbiddenException('Seul le propriétaire peut modifier l\'agence');
    Object.assign(agency, dto);
    return this.agencyRepo.save(agency);
  }

  async getMembers(agencyId: string): Promise<AgencyMember[]> {
    return this.memberRepo.find({
      where: { agencyId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async addMember(agencyId: string, email: string, role: string = 'member'): Promise<AgencyMember> {
    let user = await this.userRepo.findOne({ where: { email } });

    if (!user) {
      const randomPassword = Math.random().toString(36).slice(-12);
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      user = this.userRepo.create({ email, passwordHash, name: email.split('@')[0] });
      user = await this.userRepo.save(user);
    }

    const existing = await this.memberRepo.findOne({ where: { agencyId, userId: user.id } });
    if (existing) throw new ForbiddenException('Cet utilisateur est déjà membre');

    const member = await this.memberRepo.save({ agencyId, userId: user.id, role: role as any });

    const agency = await this.findById(agencyId);
    await this.sendInviteEmail(email, agency.name);

    return member;
  }

  async removeMember(memberId: string): Promise<void> {
    const member = await this.memberRepo.findOne({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Membre non trouvé');
    if (member.role === 'owner') throw new ForbiddenException('Impossible de supprimer le propriétaire');
    await this.memberRepo.remove(member);
  }

  async getMemberRole(agencyId: string, userId: string): Promise<string | null> {
    const member = await this.memberRepo.findOne({ where: { agencyId, userId } });
    return member?.role ?? null;
  }

  async getReports(agencyId: string): Promise<Report[]> {
    const projects = await this.projectRepo.find({ where: { agencyId } });
    if (projects.length === 0) return [];
    const projectIds = projects.map(p => p.id);
    return this.reportRepo.find({
      where: { projectId: In(projectIds) },
      order: { createdAt: 'DESC' },
    });
  }

  async getProjects(agencyId: string): Promise<Project[]> {
    return this.projectRepo.find({
      where: { agencyId },
      order: { createdAt: 'DESC' },
    });
  }

  async createProject(agencyId: string, userId: string, body: { name: string; domain: string; countryCode?: string; languageCode?: string }): Promise<Project> {
    return this.projectRepo.save({
      agencyId,
      userId,
      name: body.name,
      domain: body.domain,
      countryCode: body.countryCode || 'FR',
      languageCode: body.languageCode || 'fr',
    } as any);
  }

  private async sendInviteEmail(email: string, agencyName: string): Promise<void> {
    const apiKey = this.configService.get('ZEZE_API_KEY');
    const projectId = this.configService.get('ZEZE_PROJECT_ID');
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');

    if (!apiKey || !projectId) {
      this.logger.warn('ZEZE_API_KEY or ZEZE_PROJECT_ID not set — invite email not sent');
      this.logger.log(`Invite link for ${email}: ${frontendUrl}/login`);
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
          to: email,
          subject: `Invitation à rejoindre ${agencyName} sur Nexora`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">Vous êtes invité !</h2>
              <p>Vous avez été invité à rejoindre <strong>${agencyName}</strong> sur Nexora.</p>
              <p>Connectez-vous avec votre email <strong>${email}</strong> pour accéder à l'espace agence.</p>
              <a href="${frontendUrl}/login" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                Se connecter
              </a>
              <p style="color: #666; font-size: 12px;">Si vous n'avez pas de compte, un compte a été créé pour vous. Utilisez "Mot de passe oublié" pour définir votre mot de passe.</p>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        this.logger.error(`Invite email failed: ${response.status}`);
      }
    } catch (error) {
      this.logger.error(`Invite email error: ${(error as Error).message}`);
    }
  }
}
