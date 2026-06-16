import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Keyword } from './entities/keyword.entity';
import { KeywordPosition } from './entities/keyword-position.entity';
import { RankTrackingService } from './rank-tracking.service';
import { RankTrackingProcessor } from './rank-tracking.processor';
import { RankTrackingCron } from './rank-tracking.cron';
import { RankTrackingController } from './rank-tracking.controller';
import { SerpModule } from '../serp/serp.module';
import { BillingModule } from '../billing/billing.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Keyword, KeywordPosition]),
    BullModule.registerQueue({ name: 'rank-tracking' }),
    SerpModule,
    forwardRef(() => BillingModule),
    forwardRef(() => ProjectsModule),
  ],
  providers: [
    RankTrackingService,
    RankTrackingProcessor,
    RankTrackingCron,
  ],
  controllers: [RankTrackingController],
  exports: [RankTrackingService],
})
export class KeywordsModule {}
