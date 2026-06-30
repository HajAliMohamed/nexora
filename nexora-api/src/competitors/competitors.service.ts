import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Competitor } from '../projects/entities/competitor.entity';
import { Keyword } from '../keywords/entities/keyword.entity';
import { KeywordPosition } from '../keywords/entities/keyword-position.entity';
import { CompetitorPosition } from './entities/competitor-position.entity';
import { LimitsService } from '../billing/limits.service';
import { ProjectsService } from '../projects/projects.service';
import { SerpService } from '../serp/serp.service';
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
  private readonly logger = new Logger(CompetitorsService.name);

  constructor(
    @InjectRepository(Competitor)
    private readonly competitorRepo: Repository<Competitor>,
    @InjectRepository(Keyword)
    private readonly keywordRepo: Repository<Keyword>,
    @InjectRepository(KeywordPosition)
    private readonly positionRepo: Repository<KeywordPosition>,
    @InjectRepository(CompetitorPosition)
    private readonly compPosRepo: Repository<CompetitorPosition>,
    private readonly limitsService: LimitsService,
    private readonly projectsService: ProjectsService,
    private readonly serpService: SerpService,
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

  async refreshPositions(projectId: string): Promise<void> {
    const competitors = await this.competitorRepo.find({ where: { projectId } });
    if (competitors.length === 0) return;

    const keywords = await this.keywordRepo.find({ where: { projectId } });
    if (keywords.length === 0) return;

    const project = await this.projectsService.findById(projectId);
    if (!project) return;

    const languageCode = project.languageCode || 'fr';
    const countryCode = project.countryCode || 'FR';

    const entries: Partial<CompetitorPosition>[] = [];

    for (const competitor of competitors) {
      const cleanDomain = competitor.domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

      for (const kw of keywords) {
        const result = await this.serpService.getRanking({
          keyword: kw.keyword,
          domain: cleanDomain,
          countryCode,
          languageCode,
          device: 'desktop',
        });

        entries.push({
          competitorId: competitor.id,
          keywordId: kw.id,
          position: result.position,
          url: result.url ?? null,
        });
      }
    }

    if (entries.length > 0) {
      await this.compPosRepo.save(entries);
    }
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

    const competitorData = await Promise.all(
      competitors.map(async (c) => {
        const positions = await this.compPosRepo.find({
          where: { competitorId: c.id },
        });

        const top10 = positions.filter(p => p.position != null && p.position <= 10);
        const traffic = top10.reduce((sum, p) => sum + 100 * getCTR(p.position!), 0);

        return {
          id: c.id,
          domain: c.domain,
          keywordsTop10: top10.length,
          estimatedTraffic: Math.round(traffic),
        };
      }),
    );

    return {
      projectKeywordsTop10,
      projectEstimatedTraffic: Math.round(projectEstimatedTraffic),
      competitors: competitorData,
    };
  }

  async getKeywordsDiff(projectId: string): Promise<KeywordDiffResult[]> {
    const keywords = await this.keywordRepo.find({ where: { projectId } });
    const competitors = await this.competitorRepo.find({ where: { projectId } });

    const results: KeywordDiffResult[] = [];

    for (const kw of keywords) {
      const latestPos = await this.positionRepo.findOne({
        where: { keywordId: kw.id },
        order: { date: 'DESC' },
      });

      const competitorPositions = await Promise.all(
        competitors.map(async (c) => {
          const cp = await this.compPosRepo.findOne({
            where: { competitorId: c.id, keywordId: kw.id },
            order: { date: 'DESC' },
          });
          return { domain: c.domain, position: cp?.position ?? null };
        }),
      );

      results.push({
        keyword: kw.keyword,
        yourPosition: latestPos?.position ?? null,
        competitorPositions,
      });
    }

    return results;
  }
}
