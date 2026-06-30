import {
  Controller, Get, Param, Req, Res, NotFoundException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from './entities/report.entity';
import { SharingService } from './sharing.service';
import { PdfV2Service } from './pdf-v2.service';

@Controller('reports')
export class SharedReportsController {
  constructor(
    private readonly sharingService: SharingService,
    private readonly pdfV2Service: PdfV2Service,
    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,
  ) {}

  @Get('shared/:token')
  async getSharedReport(@Param('token') token: string) {
    const payload = this.sharingService.verifySignedUrl(token);
    if (!payload) throw new NotFoundException('Invalid or expired share link');

    const report = await this.reportRepo.findOne({ where: { id: payload.reportId } });
    if (!report) throw new NotFoundException('Report not found');

    return report;
  }

  @Get('shared/:token/pdf')
  async getSharedReportPdf(
    @Param('token') token: string,
    @Res() res: Response,
  ) {
    const payload = this.sharingService.verifySignedUrl(token);
    if (!payload) {
      res.status(404).json({ error: 'Invalid or expired share link' });
      return;
    }

    const report = await this.reportRepo.findOne({ where: { id: payload.reportId } });
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
      'Content-Disposition': `attachment; filename="nexora-report-${report.id}.pdf"`,
    });
    res.send(pdfBuffer);
  }
}
