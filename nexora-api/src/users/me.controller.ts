import { Controller, Get, Patch, Post, Body, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '../common/guards/auth.guard';
import { UsersService } from './users.service';
import { Project } from '../projects/entities/project.entity';
import { ClientUser } from '../clients/entities/client-user.entity';

@Controller()
export class MeController {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ClientUser)
    private readonly clientRepo: Repository<ClientUser>,
  ) {}

  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@Req() req: Request) {
    const user = (req as any).user;
    const full = await this.usersService.findById(user.id);
    return {
      id: full.id,
      email: full.email,
      name: full.name,
      role: full.role,
      onboardingComplete: full.onboardingComplete,
      createdAt: full.createdAt,
    };
  }

  @Get('me/projects')
  @UseGuards(AuthGuard)
  async myProjects(@Req() req: Request) {
    const userId = (req as any).user.id;
    const email = (req as any).user.email;

    const clientUser = await this.clientRepo.findOne({ where: { email } });
    if (clientUser) {
      return this.projectRepo.find({
        where: { clientId: clientUser.id },
        order: { createdAt: 'DESC' },
      });
    }

    return this.projectRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  async updateProfile(@Req() req: Request, @Body() body: { name?: string; email?: string }) {
    const user = (req as any).user;
    const updated = await this.usersService.updateProfile(user.id, body);
    return { id: updated.id, email: updated.email, name: updated.name };
  }

  @Post('me/password')
  @UseGuards(AuthGuard)
  async changePassword(
    @Req() req: Request,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    const user = (req as any).user;
    await this.usersService.changePassword(user.id, body.currentPassword, body.newPassword);
    return { success: true };
  }

  @Patch('me/onboarding-complete')
  @UseGuards(AuthGuard)
  async completeOnboarding(@Req() req: Request) {
    const user = (req as any).user;
    await this.usersService.updateOnboarding(user.id, true);
    return { success: true };
  }
}
