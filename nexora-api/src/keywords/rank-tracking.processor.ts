import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { RankTrackingService } from './rank-tracking.service';
import { SerpService } from '../serp/serp.service';
import { ProjectsService } from '../projects/projects.service';

@Processor('rank-tracking')
export class RankTrackingProcessor extends WorkerHost {
  constructor(
    private readonly rankService: RankTrackingService,
    private readonly serpService: SerpService,
    private readonly projectsService: ProjectsService,
  ) {
    super();
  }

  async process(job: Job<{ keywordId: string }>): Promise<void> {
    const keyword = await this.rankService.getKeywordById(job.data.keywordId);
    if (!keyword) return;

    const project = await this.projectsService.findById(keyword.projectId);
    const result = await this.serpService.getRanking({
      keyword: keyword.keyword,
      domain: project.domain,
      countryCode: keyword.countryCode,
      languageCode: keyword.languageCode,
      device: keyword.device as 'desktop' | 'mobile',
    });

    await this.rankService.addPosition(keyword.id, {
      date: new Date(),
      position: result.position,
      url: result.url,
    });
  }
}
