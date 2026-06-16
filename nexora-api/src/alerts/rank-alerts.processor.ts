import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AlertsService } from './alerts.service';
import { RankTrackingService } from '../keywords/rank-tracking.service';

@Processor('alerts')
export class RankAlertsProcessor extends WorkerHost {
  constructor(
    private readonly alertsService: AlertsService,
    private readonly rankService: RankTrackingService,
  ) {
    super();
  }

  async process(job: Job<{ projectId: string; userId: string }>): Promise<void> {
    const { projectId, userId } = job.data;
    const changes = await this.rankService.getBigChanges(projectId, 10);

    for (const c of changes.gains) {
      await this.alertsService.createAlert({
        userId, projectId, type: 'ranking_gain',
        payload: { keyword: c.keyword, from: c.from, to: c.to, change: c.from - c.to },
      });
    }
    for (const c of changes.losses) {
      await this.alertsService.createAlert({
        userId, projectId, type: 'ranking_drop',
        payload: { keyword: c.keyword, from: c.from, to: c.to, change: c.to - c.from },
      });
    }
  }
}
