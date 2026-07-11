import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { AiSearchService } from './ai-search.service';

@Controller('projects/:id/ai-search')
@UseGuards(AuthGuard)
export class AiSearchController {
  constructor(private readonly aiSearchService: AiSearchService) {}

  @Get()
  async getVisibility(@Param('id') id: string) {
    return this.aiSearchService.computeVisibility(id);
  }

  @Get('defense')
  async getDefense(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user.id;
    return this.aiSearchService.computeDefense(id, userId);
  }
}
