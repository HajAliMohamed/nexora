import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { LandingService } from './landing.service';
import { GenerateLandingDto } from './dto/generate-landing.dto';

@Controller('projects/:projectId/landing')
@UseGuards(AuthGuard)
export class LandingController {
  constructor(private readonly landingService: LandingService) {}

  @Post('generate')
  generate(@Param('projectId') projectId: string, @Req() req: Request, @Body() dto: GenerateLandingDto) {
    const userId = (req as any).user.id;
    return this.landingService.generateLanding(projectId, userId, dto.topic, dto.keywords);
  }

  @Get()
  list(@Param('projectId') projectId: string) {
    return this.landingService.listLandings(projectId);
  }

  @Post(':id/publish')
  publishLanding(@Param('id') id: string) {
    return this.landingService.publishLanding(id);
  }
}
