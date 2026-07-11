import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { BacklinksService } from './backlinks.service';
import { FindOpportunitiesDto } from './dto/find-opportunities.dto';
import { GenerateOutreachDto } from './dto/generate-outreach.dto';

@Controller('projects/:projectId/backlinks')
@UseGuards(AuthGuard)
export class BacklinksController {
  constructor(private readonly backlinksService: BacklinksService) {}

  @Post('opportunities')
  findOpportunities(@Param('projectId') projectId: string, @Body() dto: FindOpportunitiesDto) {
    return this.backlinksService.findOpportunities(projectId, dto.domain);
  }

  @Post('outreach/generate')
  generateOutreach(@Body() dto: GenerateOutreachDto) {
    return this.backlinksService.generateOutreach(dto.opportunityId);
  }

  @Post('outreach/:id/send')
  sendOutreach(@Param('id') id: string) {
    return this.backlinksService.sendOutreach(id);
  }

  @Get('opportunities')
  listOpportunities(@Param('projectId') projectId: string) {
    return this.backlinksService.listOpportunities(projectId);
  }

  @Get('outreach')
  listOutreach(@Param('projectId') projectId: string) {
    return this.backlinksService.listOutreach(projectId);
  }
}
