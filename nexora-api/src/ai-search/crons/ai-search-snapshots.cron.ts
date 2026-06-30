import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { AiSearchService } from '../ai-search.service';

@Injectable()
export class AiSearchSnapshotsCron {
  private readonly logger = new Logger(AiSearchSnapshotsCron.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly aiSearchService: AiSearchService,
  ) {}

  @Cron('0 5 * * 1')
  async refreshSnapshots() {
    this.logger.log('Refreshing AI search snapshots for all agency projects...');
    const projects = await this.projectRepo.find({ where: { agencyId: Not(IsNull()) } });

    for (const project of projects) {
      try {
        await this.aiSearchService.computeVisibility(project.id);
        this.logger.log(`AI snapshot refreshed for project ${project.id}`);
      } catch (err) {
        this.logger.error(`Failed AI snapshot for ${project.id}: ${(err as Error).message}`);
      }
    }
    this.logger.log(`AI search snapshots done: ${projects.length} projects`);
  }
}
