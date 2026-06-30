import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GrowthSignal } from './entities/growth-signal.entity';
import { Keyword } from '../keywords/entities/keyword.entity';
import { KeywordPosition } from '../keywords/entities/keyword-position.entity';
import { Project } from '../projects/entities/project.entity';

@Injectable()
export class GrowthEngineService {
  private readonly logger = new Logger(GrowthEngineService.name);

  constructor(
    @InjectRepository(GrowthSignal)
    private readonly signalRepo: Repository<GrowthSignal>,
    @InjectRepository(Keyword)
    private readonly keywordRepo: Repository<Keyword>,
    @InjectRepository(KeywordPosition)
    private readonly positionRepo: Repository<KeywordPosition>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  async getGrowthSignals(projectId: string): Promise<{
    pages: { url: string; delta: number; status: string }[];
    keywords: { keyword: string; position: number; change: number }[];
    backlinks: { source: string; impact: number; type: string }[];
    potentialScore: number;
  }> {
    const keywords = await this.keywordRepo.find({ where: { projectId } });
    if (keywords.length === 0) {
      return { pages: [], keywords: [], backlinks: [], potentialScore: 0 };
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const keywordsNearTop3: { keyword: string; position: number; change: number }[] = [];
    const pagesMap = new Map<string, { url: string; delta: number; status: string }>();

    for (const kw of keywords) {
      const currentPos = await this.positionRepo.findOne({
        where: { keywordId: kw.id },
        order: { date: 'DESC' },
      });

      const sixtyDayPos = await this.positionRepo
        .createQueryBuilder('kp')
        .where('kp.keywordId = :kid', { kid: kw.id })
        .andWhere('kp.date <= :d', { d: sixtyDaysAgo.toISOString().split('T')[0] })
        .orderBy('kp.date', 'DESC')
        .getOne();

      const thirtyDayPos = await this.positionRepo
        .createQueryBuilder('kp')
        .where('kp.keywordId = :kid', { kid: kw.id })
        .andWhere('kp.date <= :d', { d: thirtyDaysAgo.toISOString().split('T')[0] })
        .orderBy('kp.date', 'DESC')
        .getOne();

      if (currentPos?.position) {
        const change = thirtyDayPos?.position
          ? thirtyDayPos.position - currentPos.position
          : 0;

        if (currentPos.position <= 5) {
          keywordsNearTop3.push({
            keyword: kw.keyword,
            position: currentPos.position,
            change,
          });
        }

        if (currentPos.url) {
          const existing = pagesMap.get(currentPos.url);
          if (!existing || change > existing.delta) {
            pagesMap.set(currentPos.url, {
              url: currentPos.url,
              delta: change,
              status: change > 5 ? 'rising' : change > 0 ? 'stable' : 'declining',
            });
          }
        }
      }
    }

    const pages = Array.from(pagesMap.values())
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 10);

    const risingKeywords = keywordsNearTop3.filter(k => k.change > 0);
    const potentialScore = Math.min(100, Math.round(
      (pages.filter(p => p.status === 'rising').length * 8) +
      (risingKeywords.length * 10) +
      (keywordsNearTop3.length * 5)
    ));

    const backlinks: { source: string; impact: number; type: string }[] = [];
    const trackedDomains = new Set<string>();
    for (const kw of keywords) {
      const pos = await this.positionRepo.findOne({
        where: { keywordId: kw.id },
        order: { date: 'DESC' },
      });
      if (pos?.url) {
        try {
          const domain = new URL(pos.url.startsWith('http') ? pos.url : `https://${pos.url}`).hostname;
          if (!trackedDomains.has(domain)) {
            trackedDomains.add(domain);
            const p = pos.position;
            const impact = Math.max(1, Math.min(10, 11 - (p ?? 10)));
            backlinks.push({ source: domain, impact, type: p !== null && p <= 3 ? 'strong' : p !== null && p <= 10 ? 'medium' : 'weak' });
          }
        } catch {}
      }
    }

    const signals: Partial<GrowthSignal>[] = [];
    for (const page of pages) {
      signals.push({ projectId, type: 'page', data: page as any });
    }
    for (const kw of keywordsNearTop3) {
      signals.push({ projectId, type: 'keyword', data: kw as any });
    }
    for (const bl of backlinks) {
      signals.push({ projectId, type: 'backlink', data: bl as any });
    }
    if (signals.length > 0) {
      await this.signalRepo.save(signals);
    }

    return {
      pages,
      keywords: keywordsNearTop3,
      backlinks,
      potentialScore,
    };
  }
}
