import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { SiteAudit } from './entities/site-audit.entity';
import { AuditIssue } from './entities/audit-issue.entity';
import { AuditsService } from './audits.service';
import { CrawlerService } from './crawler.service';
import { AuditScoringService } from './audit-scoring.service';
import { DuplicateContentService } from './duplicate-content.service';
import { DepthService } from './depth.service';
import { InternalLinkingService } from './internal-linking.service';
import { PageSpeedService } from './pagespeed.service';
import { AuditsProcessor } from './audits.processor';
import { AuditsController } from './audits.controller';
import { BillingModule } from '../billing/billing.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SiteAudit, AuditIssue]),
    BullModule.registerQueue({ name: 'audits' }),
    forwardRef(() => BillingModule),
    forwardRef(() => ProjectsModule),
  ],
  providers: [
    AuditsService,
    CrawlerService,
    AuditScoringService,
    DuplicateContentService,
    DepthService,
    InternalLinkingService,
    PageSpeedService,
    AuditsProcessor,
  ],
  controllers: [AuditsController],
  exports: [AuditsService, AuditScoringService],
})
export class AuditsModule {}
