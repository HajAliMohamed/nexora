import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { ContentService } from './content.service';
import { GenerateBriefDto, GenerateArticleDto } from './dto/generate-brief.dto';

@Controller('projects/:projectId/content')
@UseGuards(AuthGuard)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post('briefs')
  generateBrief(@Param('projectId') projectId: string, @Req() req: Request, @Body() dto: GenerateBriefDto) {
    const userId = (req as any).user.id;
    return this.contentService.generateBrief(projectId, userId, dto.topic, dto.keywords);
  }

  @Post('articles/generate')
  generateArticle(@Body() dto: GenerateArticleDto) {
    return this.contentService.generateArticle(dto.briefId);
  }

  @Get('briefs')
  listBriefs(@Param('projectId') projectId: string) {
    return this.contentService.listBriefs(projectId);
  }

  @Get('articles')
  listArticles(@Param('projectId') projectId: string) {
    return this.contentService.listArticles(projectId);
  }
}
