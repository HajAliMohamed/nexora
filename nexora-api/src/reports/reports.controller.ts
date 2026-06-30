import {
  Controller, Get, Post, Param, Req, Res, Body, UseGuards, Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '../common/guards/auth.guard';
import { LimitsService } from '../billing/limits.service';
import { ReportsService } from './reports.service';
import { ReportBuilderService } from './report-builder.service';
import { PdfV2Service } from './pdf-v2.service';
import { SharingService } from './sharing.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Report } from './entities/report.entity';
import { Project } from '../projects/entities/project.entity';
import { ClientUser } from '../clients/entities/client-user.entity';
import { GenerateReportDto } from './dto/generate-report.dto';
import { emailFetch } from '../common/email.utils';

@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(
    private readonly reportsService: ReportsService,
    private readonly limitsService: LimitsService,
    private readonly reportBuilder: ReportBuilderService,
    private readonly pdfV2Service: PdfV2Service,
    private readonly sharingService: SharingService,
    private readonly configService: ConfigService,
    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ClientUser)
    private readonly clientRepo: Repository<ClientUser>,
  ) {}

  @Get()
  async listMyReports(@Req() req: Request) {
    const userId = (req as any).user.id;
    const email = (req as any).user.email;

    const ownedProjects = await this.projectRepo.find({ where: { userId } });
    const ownedIds = ownedProjects.map(p => p.id);

    const clientUser = await this.clientRepo.findOne({ where: { email } });
    let clientProjectIds: string[] = [];
    if (clientUser?.id) {
      const clientProjects = await this.projectRepo.find({ where: { clientId: clientUser.id } });
      clientProjectIds = clientProjects.map(p => p.id);
    }

    const allProjectIds = [...new Set([...ownedIds, ...clientProjectIds])];
    if (allProjectIds.length === 0) return [];

    return this.reportRepo.find({
      where: { projectId: In(allProjectIds) },
      order: { createdAt: 'DESC' },
    });
  }

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

  @Post('project/:projectId/generate')
  async generateV2Report(
    @Param('projectId') projectId: string,
    @Body() dto: GenerateReportDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).user.id;
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) {
      return { message: 'Project not found' };
    }

    const isAgencyUser = !!project.agencyId;
    if (!isAgencyUser) {
      const canExport = await this.limitsService.canExportPdf(userId);
      if (!canExport) {
        return { message: 'Report generation requires a Pro or Agency plan' };
      }
    }

    const data = await this.reportBuilder.buildReport(projectId, dto.periodType || 'monthly');
    const report = await this.reportBuilder.saveReport(data);
    const pdfBuffer = await this.pdfV2Service.generatePdf(data);
    const pdfPath = await this.pdfV2Service.savePdf(pdfBuffer, report.id);

    report.pdfPath = pdfPath;
    report.signedUrl = this.sharingService.createSignedUrl(report.id);
    await this.reportRepo.save(report);

    this.notifyClients(projectId, report).catch(err =>
      this.logger.error(`Failed to notify clients: ${err.message}`),
    );

    return {
      reportId: report.id,
      signedUrl: report.signedUrl,
      scores: report.scores,
    };
  }

  @Get('project/:projectId')
  async listProjectReports(@Param('projectId') projectId: string) {
    return this.reportRepo.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  @Get(':reportId')
  async getReport(@Param('reportId') reportId: string) {
    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report) return { error: 'Report not found' };
    return report;
  }

  @Get(':reportId/pdf')
  async getReportPdf(
    @Param('reportId') reportId: string,
    @Res() res: Response,
  ) {
    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report?.pdfPath) {
      res.status(404).json({ error: 'PDF not found' });
      return;
    }

    const pdfBuffer = await this.pdfV2Service.getPdfBuffer(report.pdfPath);
    if (!pdfBuffer) {
      res.status(404).json({ error: 'PDF file not found' });
      return;
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="nexora-report-${reportId}.pdf"`,
    });
    res.send(pdfBuffer);
  }

  private async notifyClients(projectId: string, report: Report): Promise<void> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project?.agencyId) return;

    const clients = await this.clientRepo.find({ where: { agencyId: project.agencyId, active: true } });
    if (clients.length === 0) return;

    const apiKey = this.configService.get('ZEZE_API_KEY');
    const zezeProjectId = this.configService.get('ZEZE_PROJECT_ID');
    if (!apiKey || !zezeProjectId) return;

    for (const client of clients) {
      try {
        await emailFetch('https://quantumgateapi.fr/v1/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
          body: JSON.stringify({
            projectId: zezeProjectId,
            from: 'noreply@zeze-innovation.com',
            to: client.email,
            subject: `Nouveau rapport SEO disponible — ${project.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333;">Votre rapport SEO est prêt</h2>
                <p>Un nouveau rapport ${report.periodType} a été généré pour <strong>${project.name}</strong>.</p>
                <p><strong>Scores :</strong> SEO ${report.seoScore ?? '–'} / IA ${report.aiScore ?? '–'} / Croissance ${report.growthScore ?? '–'}</p>
                ${report.signedUrl ? `<a href="${report.signedUrl}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">Consulter le rapport</a>` : ''}
                <p style="color: #666; font-size: 12px;">Ce rapport a été généré automatiquement.</p>
              </div>
            `,
          }),
        });
      } catch (err) {
        this.logger.error(`Email to ${client.email} failed: ${(err as Error).message}`);
      }
    }
  }
}
