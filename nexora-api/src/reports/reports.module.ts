import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SiteAudit } from '../audits/entities/site-audit.entity';
import { AuditIssue } from '../audits/entities/audit-issue.entity';
import { Keyword } from '../keywords/entities/keyword.entity';
import { KeywordPosition } from '../keywords/entities/keyword-position.entity';
import { Project } from '../projects/entities/project.entity';
import { Report } from './entities/report.entity';
import { ClientUser } from '../clients/entities/client-user.entity';
import { AiSearchSnapshot } from '../ai-search/entities/ai-search-snapshot.entity';
import { GrowthSignal } from '../growth-engine/entities/growth-signal.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { SharedReportsController } from './shared.controller';
import { ReportBuilderService } from './report-builder.service';
import { PdfV2Service } from './pdf-v2.service';
import { SharingService } from './sharing.service';
import { BillingModule } from '../billing/billing.module';
import { MonthlyReportsCron } from './crons/monthly-reports.cron';
import { S3Service } from '../common/s3.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SiteAudit, AuditIssue, Keyword, KeywordPosition, Project,
      Report, ClientUser, AiSearchSnapshot, GrowthSignal,
    ]),
    BillingModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [ReportsService, ReportBuilderService, PdfV2Service, SharingService, MonthlyReportsCron, S3Service],
  controllers: [ReportsController, SharedReportsController],
  exports: [ReportsService, ReportBuilderService],
})
export class ReportsModule {}
