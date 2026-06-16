import {
  Controller, Get, Post, Delete, Body, Param, Req, UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { CompetitorsService } from './competitors.service';
import { AddCompetitorDto } from './dto/add-competitor.dto';

@Controller('projects/:projectId/competitors')
@UseGuards(AuthGuard)
export class CompetitorsController {
  constructor(private readonly competitorsService: CompetitorsService) {}

  @Get()
  listCompetitors(@Param('projectId') projectId: string) {
    return this.competitorsService.listCompetitors(projectId);
  }

  @Post()
  addCompetitor(
    @Param('projectId') projectId: string,
    @Req() req: Request,
    @Body() dto: AddCompetitorDto,
  ) {
    const userId = (req as any).user.id;
    return this.competitorsService.addCompetitor(projectId, dto.domain, userId);
  }

  @Delete(':id')
  removeCompetitor(@Param('id') id: string) {
    return this.competitorsService.removeCompetitor(id);
  }

  @Get('overview')
  getOverview(@Param('projectId') projectId: string) {
    return this.competitorsService.getOverview(projectId);
  }

  @Get('keywords-diff')
  getKeywordsDiff(@Param('projectId') projectId: string) {
    return this.competitorsService.getKeywordsDiff(projectId);
  }
}
