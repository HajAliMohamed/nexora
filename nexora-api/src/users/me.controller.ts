import { Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
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
    };
  }

  @Patch('me/onboarding-complete')
  @UseGuards(AuthGuard)
  async completeOnboarding(@Req() req: Request) {
    const user = (req as any).user;
    await this.usersService.updateOnboarding(user.id, true);
    return { success: true };
  }
}
