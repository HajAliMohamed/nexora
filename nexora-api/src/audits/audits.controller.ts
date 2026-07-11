import {
  Controller, Get, Post, Param, Query, Req, UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { AuditsService } from './audits.service';
import { LimitsService } from '../billing/limits.service';
import { ProjectsService } from '../projects/projects.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller()
@UseGuards(AuthGuard)
export class AuditsController {
  constructor(
    private readonly auditsService: AuditsService,
    private readonly limitsService: LimitsService,
    private readonly projectsService: ProjectsService,
    @InjectQueue('audits') private readonly auditsQueue: Queue,
  ) {}

  @Post('projects/:projectId/audits')
  async createAudit(
    @Param('projectId') projectId: string,
    @Req() req: Request,
  ) {
    const userId = (req as any).user.id;
    await this.limitsService.ensureCanRunAudit(userId);
    const maxPages = await this.limitsService.getMaxPagesPerAudit(userId);

    const audit = await this.auditsService.createAudit(projectId);
    await this.auditsQueue.add('run-audit', {
      auditId: audit.id,
      projectId,
      maxPages,
    }, { attempts: 2 });

    return audit;
  }

  @Get('projects/:projectId/audits')
  listAudits(@Param('projectId') projectId: string) {
    return this.auditsService.listAuditsForProject(projectId);
  }

  @Get('audits/:auditId')
  getAudit(@Param('auditId') auditId: string) {
    return this.auditsService.getAudit(auditId);
  }

  @Get('audits/:auditId/issues')
  getIssues(
    @Param('auditId') auditId: string,
    @Query('severity') severity?: string,
    @Query('type') type?: string,
  ) {
    return this.auditsService.getAuditIssues(auditId, { severity, type });
  }

  @Get('audits/:auditId/auto-fixes')
  getAutoFixes(@Param('auditId') auditId: string) {
    return this.auditsService.getAutoFixes(auditId);
  }
}
