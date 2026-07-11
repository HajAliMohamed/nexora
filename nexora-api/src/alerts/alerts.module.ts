import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { SeoAlert } from './entities/seo-alert.entity';
import { AlertsService } from './alerts.service';
import { RankAlertsProcessor } from './rank-alerts.processor';
import { AlertsCron } from './alerts.cron';
import { AlertsController } from './alerts.controller';
import { KeywordsModule } from '../keywords/keywords.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SeoAlert]),
    BullModule.registerQueue({ name: 'alerts' }),
    forwardRef(() => KeywordsModule),
    forwardRef(() => ProjectsModule),
  ],
  providers: [AlertsService, RankAlertsProcessor, AlertsCron],
  controllers: [AlertsController],
  exports: [AlertsService],
})
export class AlertsModule {}
