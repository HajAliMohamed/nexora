import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SiteAudit } from '../audits/entities/site-audit.entity';
import { AuditIssue } from '../audits/entities/audit-issue.entity';
import { Keyword } from '../keywords/entities/keyword.entity';
import { KeywordPosition } from '../keywords/entities/keyword-position.entity';
import { Project } from '../projects/entities/project.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SiteAudit, AuditIssue, Keyword, KeywordPosition, Project]),
    BillingModule,
  ],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
