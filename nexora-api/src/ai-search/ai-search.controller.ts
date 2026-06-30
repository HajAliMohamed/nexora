import { Controller, Get, Param, UseGuards } from '@nestjs/common';
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
}
