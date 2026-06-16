import { Injectable, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionsService } from './subscriptions.service';
import { ProjectsService } from '../projects/projects.service';
import { SiteAudit } from '../audits/entities/site-audit.entity';
import { Project } from '../projects/entities/project.entity';
import type { PlanLimits } from '../types/shared';

@Injectable()
export class LimitsService {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    @Inject(forwardRef(() => ProjectsService))
    private readonly projectsService: ProjectsService,
    @InjectRepository(SiteAudit)
    private readonly auditRepo: Repository<SiteAudit>,
  ) {}

  async ensureCanCreateProject(userId: string): Promise<void> {
    const limits = await this.getPlanLimits(userId);
    const count = await this.projectsService.countByUser(userId);
    if (count >= limits.maxProjects) {
      throw new ForbiddenException('Limite de projets atteinte. Augmentez votre offre.');
    }
  }

  async ensureCanAddKeyword(userId: string): Promise<void> {
    const limits = await this.getPlanLimits(userId);
    if (limits.maxKeywords <= 0) {
      throw new ForbiddenException('Limite de mots-clés atteinte. Augmentez votre offre.');
    }
  }

  async ensureCanRunAudit(userId: string): Promise<void> {
    const limits = await this.getPlanLimits(userId);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const count = await this.auditRepo
      .createQueryBuilder('audit')
      .innerJoin(Project, 'project', 'project.id = audit.projectId')
      .where('project.userId = :userId', { userId })
      .andWhere('audit.createdAt >= :start', { start: startOfMonth })
      .getCount();
    if (count >= limits.maxAuditsPerMonth) {
      throw new ForbiddenException('Limite d\'audits mensuelle atteinte. Augmentez votre offre.');
    }
  }

  async getMaxPagesPerAudit(userId: string): Promise<number> {
    const limits = await this.getPlanLimits(userId);
    return limits.maxPagesPerAudit;
  }

  async getMaxKeywordSearchesPerDay(userId: string): Promise<number> {
    const limits = await this.getPlanLimits(userId);
    return limits.maxKeywordSearchesPerDay;
  }

  async ensureCanAddCompetitor(userId: string, projectId: string): Promise<void> {
    const limits = await this.getPlanLimits(userId);
    const count = await this.projectsService.getCompetitors(projectId).then(c => c.length);
    if (count >= limits.maxCompetitorsPerProject) {
      throw new ForbiddenException('Limite de concurrents atteinte. Augmentez votre offre.');
    }
  }

  async canExportPdf(userId: string): Promise<boolean> {
    const limits = await this.getPlanLimits(userId);
    return limits.pdfExport;
  }

  async getPlanLimits(userId: string): Promise<PlanLimits> {
    const sub = await this.subscriptionsService.getActiveSubscription(userId);
    return sub.limits;
  }
}
