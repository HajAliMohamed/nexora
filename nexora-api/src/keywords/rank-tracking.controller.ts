import {
  Controller, Get, Post, Delete, Param, Query, Body, Req, UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { RankTrackingService } from './rank-tracking.service';
import { AddKeywordDto } from './dto/add-keyword.dto';

@Controller()
@UseGuards(AuthGuard)
export class RankTrackingController {
  constructor(private readonly rankService: RankTrackingService) {}

  @Post('projects/:projectId/keywords')
  addKeyword(
    @Param('projectId') projectId: string,
    @Req() req: Request,
    @Body() dto: AddKeywordDto,
  ) {
    const userId = (req as any).user.id;
    return this.rankService.addKeyword(projectId, userId, dto);
  }

  @Get('projects/:projectId/keywords')
  listKeywords(@Param('projectId') projectId: string) {
    return this.rankService.listKeywords(projectId);
  }

  @Get('projects/:projectId/keywords/with-positions')
  listKeywordsWithPositions(@Param('projectId') projectId: string) {
    return this.rankService.listKeywordsWithPositions(projectId);
  }

  @Delete('keywords/:id')
  deleteKeyword(@Param('id') id: string) {
    return this.rankService.deleteKeyword(id);
  }

  @Get('keywords/:id/positions')
  getPositions(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.rankService.getPositions(id, from, to);
  }

  @Get('projects/:projectId/keywords/summary')
  getProjectSummary(@Param('projectId') projectId: string) {
    return this.rankService.getProjectSummary(projectId);
  }

  @Get('projects/:projectId/keywords/summary/gains-losses')
  getBigChanges(
    @Param('projectId') projectId: string,
    @Query('threshold') threshold?: string,
  ) {
    return this.rankService.getBigChanges(projectId, threshold ? parseInt(threshold, 10) : 10, 30);
  }

  @Get('projects/:projectId/keywords/visibility')
  async getVisibility(@Param('projectId') projectId: string) {
    const keywords = await this.rankService.listKeywords(projectId);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const startStr = ninetyDaysAgo.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    const visibilityMap: Record<string, { totalPoints: number; keywordCount: number }> = {};
    for (const kw of keywords) {
      const positions = await this.rankService.getPositions(kw.id, startStr, todayStr);
      for (const pos of positions) {
        if (!pos.position) continue;
        const dateKey = pos.date;
        if (!visibilityMap[dateKey]) {
          visibilityMap[dateKey] = { totalPoints: 0, keywordCount: 0 };
        }
        visibilityMap[dateKey].keywordCount++;
        if (pos.position === 1) visibilityMap[dateKey].totalPoints += 100;
        else if (pos.position <= 3) visibilityMap[dateKey].totalPoints += 60;
        else if (pos.position <= 5) visibilityMap[dateKey].totalPoints += 30;
        else if (pos.position <= 10) visibilityMap[dateKey].totalPoints += 10;
        else if (pos.position <= 20) visibilityMap[dateKey].totalPoints += 3;
      }
    }

    const points: { date: string; score: number }[] = [];
    for (const [date, data] of Object.entries(visibilityMap)) {
      const score = data.keywordCount > 0
        ? Math.round((data.totalPoints / (data.keywordCount * 100)) * 100)
        : 0;
      points.push({ date, score });
    }
    points.sort((a, b) => a.date.localeCompare(b.date));

    return points;
  }
}
