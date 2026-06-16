import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Competitor } from '../projects/entities/competitor.entity';
import { Project } from '../projects/entities/project.entity';
import { Keyword } from '../keywords/entities/keyword.entity';
import { KeywordPosition } from '../keywords/entities/keyword-position.entity';
import { LimitsService } from '../billing/limits.service';
import { ProjectsService } from '../projects/projects.service';
import type { CompetitorOverview, KeywordDiffResult } from '../types/shared';

const CTR_MODEL: Record<string, number> = {
  '1': 0.28, '2': 0.15, '3': 0.11, '4-5': 0.07, '6-10': 0.03,
};

function getCTR(position: number): number {
  if (position === 1) return 0.28;
  if (position === 2) return 0.15;
  if (position === 3) return 0.11;
  if (position <= 5) return 0.07;
  if (position <= 10) return 0.03;
  return 0.005;
}

@Injectable()
export class CompetitorsService {
  constructor(
    @InjectRepository(Competitor)
    private readonly competitorRepo: Repository<Competitor>,
    @InjectRepository(Keyword)
    private readonly keywordRepo: Repository<Keyword>,
    @InjectRepository(KeywordPosition)
    private readonly positionRepo: Repository<KeywordPosition>,
    private readonly limitsService: LimitsService,
    private readonly projectsService: ProjectsService,
  ) {}

  async listCompetitors(projectId: string): Promise<Competitor[]> {
    return this.competitorRepo.find({ where: { projectId } });
  }

  async addCompetitor(projectId: string, domain: string, userId: string): Promise<Competitor> {
    await this.projectsService.findById(projectId);
    await this.limitsService.ensureCanAddCompetitor(userId, projectId);
    const competitor = this.competitorRepo.create({ projectId, domain });
    return this.competitorRepo.save(competitor);
  }

  async removeCompetitor(id: string): Promise<void> {
    const competitor = await this.competitorRepo.findOne({ where: { id } });
    if (!competitor) throw new NotFoundException('Concurrent introuvable');
    await this.competitorRepo.remove(competitor);
  }

  async getOverview(projectId: string): Promise<CompetitorOverview> {
    const keywords = await this.keywordRepo.find({ where: { projectId } });
    const competitors = await this.competitorRepo.find({ where: { projectId } });

    let projectKeywordsTop10 = 0;
    let projectEstimatedTraffic = 0;

    for (const kw of keywords) {
      const latestPos = await this.positionRepo.findOne({
        where: { keywordId: kw.id },
        order: { date: 'DESC' },
      });
      if (latestPos?.position && latestPos.position <= 10) {
        projectKeywordsTop10++;
        projectEstimatedTraffic += 100 * getCTR(latestPos.position);
      }
    }

    return {
      projectKeywordsTop10,
      projectEstimatedTraffic: Math.round(projectEstimatedTraffic),
      competitors: competitors.map(c => ({
        id: c.id,
        domain: c.domain,
        keywordsTop10: 0,
        estimatedTraffic: 0,
      })),
    };
  }

  async getKeywordsDiff(projectId: string): Promise<KeywordDiffResult[]> {
    const keywords = await this.keywordRepo.find({ where: { projectId } });
    const results: KeywordDiffResult[] = [];

    for (const kw of keywords) {
      const latestPos = await this.positionRepo.findOne({
        where: { keywordId: kw.id },
        order: { date: 'DESC' },
      });
      results.push({
        keyword: kw.keyword,
        yourPosition: latestPos?.position ?? null,
        competitorPositions: [],
      });
    }

    return results;
  }
}
