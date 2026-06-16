import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class AlertsCron {
  private readonly logger = new Logger(AlertsCron.name);

  constructor(
    private readonly projectsService: ProjectsService,
    @InjectQueue('alerts') private readonly alertsQueue: Queue,
  ) {}

  @Cron('0 6 * * *')
  async enqueueChecks() {
    this.logger.log('Enqueuing daily alert checks for all projects');
    const projects = await this.projectsService.getAllWithOwners();
    for (const p of projects) {
      await this.alertsQueue.add('check-rank-changes', { projectId: p.id, userId: p.userId }, { attempts: 2 });
    }
    this.logger.log(`Enqueued ${projects.length} alert check jobs`);
  }
}
