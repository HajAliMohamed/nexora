import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { KeywordResearchService } from './keyword-research.service';
import { RankTrackingService } from '../keywords/rank-tracking.service';

@Controller('keyword-research')
@UseGuards(AuthGuard)
export class KeywordResearchController {
  constructor(
    private readonly researchService: KeywordResearchService,
    private readonly rankTrackingService: RankTrackingService,
  ) {}

  @Get('search')
  search(
    @Query('query') query: string,
    @Query('country') country: string,
    @Query('language') language: string,
    @Req() req: Request,
  ) {
    const userId = (req as any).user.id;
    return this.researchService.search({
      query,
      countryCode: country,
      languageCode: language,
      userId,
    });
  }

  @Post('add-to-project')
  addToProject(
    @Req() req: Request,
    @Body() body: { keyword: string; projectId: string; countryCode: string; languageCode: string; device?: string },
  ) {
    const userId = (req as any).user.id;
    return this.rankTrackingService.addKeyword(body.projectId, userId, {
      keyword: body.keyword,
      countryCode: body.countryCode,
      languageCode: body.languageCode,
      device: body.device || 'desktop',
    });
  }
}
