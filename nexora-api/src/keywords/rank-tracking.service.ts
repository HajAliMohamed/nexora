import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, In } from 'typeorm';
import { Keyword } from './entities/keyword.entity';
import { KeywordPosition } from './entities/keyword-position.entity';
import { LimitsService } from '../billing/limits.service';
import { ProjectsService } from '../projects/projects.service';
import { AddKeywordDto } from './dto/add-keyword.dto';
import type { GainsLosses } from '../types/shared';

@Injectable()
export class RankTrackingService {
  constructor(
    @InjectRepository(Keyword)
    private readonly keywordRepo: Repository<Keyword>,
    @InjectRepository(KeywordPosition)
    private readonly positionRepo: Repository<KeywordPosition>,
    private readonly limitsService: LimitsService,
    private readonly projectsService: ProjectsService,
  ) {}

  async addKeyword(projectId: string, userId: string, dto: AddKeywordDto): Promise<Keyword> {
    await this.limitsService.ensureCanAddKeyword(userId);
    await this.projectsService.findById(projectId);
    const keyword = this.keywordRepo.create({
      projectId,
      keyword: dto.keyword,
      countryCode: dto.countryCode,
      languageCode: dto.languageCode,
      device: dto.device || 'desktop',
    });
    return this.keywordRepo.save(keyword);
  }

  async listKeywords(projectId: string): Promise<Keyword[]> {
    return this.keywordRepo.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteKeyword(id: string): Promise<void> {
    const keyword = await this.keywordRepo.findOne({ where: { id } });
    if (!keyword) throw new NotFoundException('Mot-clé introuvable');
    await this.keywordRepo.remove(keyword);
  }

  async getKeywordById(id: string): Promise<Keyword | null> {
    return this.keywordRepo.findOne({ where: { id } });
  }

  async addPosition(
    keywordId: string,
    data: { date: Date; position: number | null; url?: string; serpFeatures?: Record<string, unknown> },
  ): Promise<KeywordPosition> {
    const dateStr = data.date.toISOString().split('T')[0];
    const existing = await this.positionRepo.findOne({
      where: { keywordId, date: dateStr },
    });
    if (existing) {
      existing.position = data.position;
      existing.url = data.url ?? existing.url;
      if (data.serpFeatures) existing.serpFeatures = data.serpFeatures;
      return this.positionRepo.save(existing);
    }
    const pos = this.positionRepo.create({
      keywordId,
      date: dateStr,
      position: data.position,
      url: data.url,
      serpFeatures: data.serpFeatures || {},
    });
    return this.positionRepo.save(pos);
  }

  async getPositions(keywordId: string, from?: string, to?: string): Promise<KeywordPosition[]> {
    const where: any = { keywordId };
    if (from && to) {
      where.date = Between(from, to);
    } else if (from) {
      where.date = MoreThanOrEqual(from);
    }
    return this.positionRepo.find({
      where,
      order: { date: 'ASC' },
    });
  }

  async getAllKeywords(): Promise<Keyword[]> {
    return this.keywordRepo.find();
  }

  async countKeywordsForUser(userId: string): Promise<number> {
    const projects = await this.projectsService.findAll(userId);
    const projectIds = projects.map(p => p.id);
    if (projectIds.length === 0) return 0;
    return this.keywordRepo.count({ where: { projectId: In(projectIds) } });
  }

  async getProjectSummary(projectId: string): Promise<{
    totalKeywords: number;
    avgPosition: number | null;
    gained30d: number;
    lost30d: number;
  }> {
    const keywords = await this.listKeywords(projectId);
    const totalKeywords = keywords.length;
    if (totalKeywords === 0) {
      return { totalKeywords: 0, avgPosition: null, gained30d: 0, lost30d: 0 };
    }

    let positionSum = 0;
    let positionCount = 0;
    let gained30d = 0;
    let lost30d = 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    for (const kw of keywords) {
      const latest = await this.positionRepo.findOne({
        where: { keywordId: kw.id },
        order: { date: 'DESC' },
      });
      if (latest && latest.position !== null) {
        positionSum += latest.position;
        positionCount++;
      }

      const todayPos = await this.positionRepo.findOne({
        where: { keywordId: kw.id, date: todayStr },
      });
      const pastPos = await this.positionRepo.findOne({
        where: { keywordId: kw.id, date: thirtyDaysAgoStr },
      });
      if (todayPos?.position && pastPos?.position) {
        const diff = pastPos.position - todayPos.position;
        if (diff >= 3) gained30d++;
        if (diff <= -3) lost30d++;
      }
    }

    return {
      totalKeywords,
      avgPosition: positionCount > 0 ? Math.round((positionSum / positionCount) * 10) / 10 : null,
      gained30d,
      lost30d,
    };
  }

  async getBigChanges(
    projectId: string,
    threshold: number = 10,
    days: number = 7,
  ): Promise<GainsLosses> {
    const keywords = await this.listKeywords(projectId);
    const gains: GainsLosses['gains'] = [];
    const losses: GainsLosses['losses'] = [];
    const todayStr = new Date().toISOString().split('T')[0];
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);
    const pastDateStr = pastDate.toISOString().split('T')[0];

    for (const kw of keywords) {
      const todayPos = await this.positionRepo.findOne({
        where: { keywordId: kw.id, date: todayStr },
      });
      const pastPos = await this.positionRepo.findOne({
        where: { keywordId: kw.id, date: pastDateStr },
      });
      if (!todayPos?.position || !pastPos?.position) continue;

      const change = pastPos.position - todayPos.position;
      if (change >= threshold) {
        gains.push({ keyword: kw.keyword, from: pastPos.position, to: todayPos.position, change });
      } else if (change <= -threshold) {
        losses.push({ keyword: kw.keyword, from: pastPos.position, to: todayPos.position, change: -change });
      }
    }

    return {
      gains: gains.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)),
      losses: losses.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)),
    };
  }

  async listKeywordsWithPositions(projectId: string) {
    const keywords = await this.listKeywords(projectId);
    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const result = await Promise.all(
      keywords.map(async (kw) => {
        const todayPos = await this.positionRepo.findOne({
          where: { keywordId: kw.id, date: todayStr },
        });
        const pastPos = await this.positionRepo.findOne({
          where: { keywordId: kw.id, date: sevenDaysAgoStr },
        });
        const latest = await this.positionRepo.findOne({
          where: { keywordId: kw.id },
          order: { date: 'DESC' },
        });

        const currentPos = todayPos?.position ?? null;
        const pos7dAgo = pastPos?.position ?? null;
        const change = currentPos !== null && pos7dAgo !== null ? pos7dAgo - currentPos : null;

        return {
          id: kw.id,
          keyword: kw.keyword,
          countryCode: kw.countryCode,
          languageCode: kw.languageCode,
          device: kw.device,
          createdAt: kw.createdAt,
          currentPosition: currentPos,
          change7d: change,
          lastChecked: latest?.date ?? null,
        };
      }),
    );

    return result;
  }
}
