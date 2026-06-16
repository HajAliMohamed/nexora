import {
  Controller, Get, Param, Req, Res, UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { LimitsService } from '../billing/limits.service';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly limitsService: LimitsService,
  ) {}

  @Get('audit/:auditId/pdf')
  async getAuditPdf(
    @Param('auditId') auditId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as any).user.id;
    const canExport = await this.limitsService.canExportPdf(userId);
    if (!canExport) {
      res.status(403).json({ message: 'PDF export requires a Pro or Agency plan' });
      return;
    }

    const pdf = await this.reportsService.generateAuditPdf(auditId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="nexora-audit-${auditId}.pdf"`,
    });
    res.send(pdf);
  }

  @Get('project/:projectId/rankings/pdf')
  async getRankingsPdf(
    @Param('projectId') projectId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as any).user.id;
    const canExport = await this.limitsService.canExportPdf(userId);
    if (!canExport) {
      res.status(403).json({ message: 'PDF export requires a Pro or Agency plan' });
      return;
    }

    const pdf = await this.reportsService.generateRankingsPdf(projectId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="nexora-rankings-${projectId}.pdf"`,
    });
    res.send(pdf);
  }
}
