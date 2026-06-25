import { Controller, Get, Patch, Post, Body, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { UsersService } from './users.service';

@Controller()
export class MeController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@Req() req: Request) {
    const user = (req as any).user;
    const full = await this.usersService.findById(user.id);
    return {
      id: full.id,
      email: full.email,
      name: full.name,
      onboardingComplete: full.onboardingComplete,
      createdAt: full.createdAt,
    };
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
