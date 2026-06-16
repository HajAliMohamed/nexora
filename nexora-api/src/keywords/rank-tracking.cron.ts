import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { RankTrackingService } from './rank-tracking.service';

@Injectable()
export class RankTrackingCron {
  private readonly logger = new Logger(RankTrackingCron.name);

  constructor(
    private readonly rankService: RankTrackingService,
    @InjectQueue('rank-tracking') private readonly rankQueue: Queue,
  ) {}

  @Cron('0 3 * * *')
  async enqueueDailyRefresh() {
    this.logger.log('Enqueuing daily rank refresh for all keywords');
    const keywords = await this.rankService.getAllKeywords();
    for (const kw of keywords) {
      await this.rankQueue.add('refresh-keyword', { keywordId: kw.id }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });
    }
    this.logger.log(`Enqueued ${keywords.length} keyword refresh jobs`);
  }
}
