import {
  Controller, Get, Post, Body, Query, Res,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MagicLinkService } from './magic-link.service';
import { ClientsService } from '../clients/clients.service';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';

@Controller('auth/magic-link')
export class MagicLinkController {
  constructor(
    private readonly magicLinkService: MagicLinkService,
    private readonly clientsService: ClientsService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('send')
  async sendMagicLink(@Body() body: { agencyId?: string; email: string }) {
    const client = await this.clientsService.findByEmail(body.email);
    if (!client) {
      if (!body.agencyId) {
        return { ok: false, message: 'Client non trouvé. Une agence doit vous inviter d\'abord.' };
      }
      const newClient = await this.clientsService.invite(body.agencyId, { email: body.email });
      const url = await this.magicLinkService.generateToken(newClient.id, body.email);
      return { ok: true, url };
    }
    const url = await this.magicLinkService.generateToken(client.id, body.email);
    return { ok: true, url };
  }

  @Get('verify')
  async verify(@Query('token') token: string, @Res() res: any) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    let clientId: string;
    let email: string;

    try {
      const result = await this.magicLinkService.verifyToken(token);
      clientId = result.clientId;
      email = result.email;
    } catch {
      return res.redirect(`${frontendUrl}/client/login?error=expired`);
    }

    const clientRecord = await this.clientsService.findById(clientId);

    let user;
    if (clientRecord.userId) {
      user = await this.usersService.findById(clientRecord.userId);
    } else {
      const randomPassword = Math.random().toString(36).slice(-12);
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      user = await this.usersService.createAsClient(email, passwordHash, email.split('@')[0], clientRecord.agencyId);
      await this.clientsService.linkUser(clientId, user.id);
    }

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { expiresIn: '7d' },
    );

    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 1000,
    });

    res.redirect(`${frontendUrl}/client/dashboard`);
  }
}
