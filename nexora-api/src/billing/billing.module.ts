import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from './entities/subscription.entity';
import { SiteAudit } from '../audits/entities/site-audit.entity';
import { SubscriptionsService } from './subscriptions.service';
import { LimitsService } from './limits.service';
import { BillingController } from './billing.controller';
import { ProjectsModule } from '../projects/projects.module';
import { KeywordsModule } from '../keywords/keywords.module';
import { AuditsModule } from '../audits/audits.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, SiteAudit]),
    forwardRef(() => ProjectsModule),
    forwardRef(() => KeywordsModule),
    forwardRef(() => AuditsModule),
  ],
  providers: [SubscriptionsService, LimitsService],
  controllers: [BillingController],
  exports: [SubscriptionsService, LimitsService],
})
export class BillingModule {}
