import { randomUUID } from 'node:crypto';
import {
  Injectable, UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { SubscriptionsService } from '../billing/subscriptions.service';
import { Session } from './entities/session.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly subscriptionsService: SubscriptionsService,
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
  ) {}

  async seedAdmin(): Promise<{ email: string; plan: string; created: boolean }> {
    const email = this.configService.get<string>('ADMIN_EMAIL');
    const password = this.configService.get<string>('ADMIN_PASSWORD');

    if (!email || !password) {
      throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
    }

    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      return { email, plan: 'agency', created: false };
    }

    const user = await this.usersService.create(email, password, 'Admin');
    await this.subscriptionsService.createSubscription(user.id, 'agency');
    return { email, plan: 'agency', created: true };
  }

  async signup(email: string, password: string, name?: string) {
    const user = await this.usersService.create(email, password, name);
    await this.subscriptionsService.createFree(user.id);
    return this.generateTokens(user.id, user.email, user.role);
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Identifiants invalides');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Identifiants invalides');

    return this.generateTokens(user.id, user.email, user.role);
  }

  async refresh(refreshToken: string) {
    const session = await this.sessionRepo.findOne({
      where: { refreshToken },
      relations: ['user'],
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) await this.sessionRepo.remove(session);
      throw new UnauthorizedException('Token de rafraîchissement invalide ou expiré');
    }

    return this.generateTokens(session.user.id, session.user.email, session.user.role);
  }

  async logout(refreshToken: string) {
    const session = await this.sessionRepo.findOne({ where: { refreshToken } });
    if (session) await this.sessionRepo.remove(session);
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const accessToken = this.jwtService.sign({ sub: userId, email, role });
    const refreshToken = randomUUID();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.sessionRepo.save({
      userId,
      refreshToken,
      expiresAt,
    } as any);

    return { accessToken, refreshToken };
  }
}
