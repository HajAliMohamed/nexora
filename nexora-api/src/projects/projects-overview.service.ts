import { Injectable } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { AuditsService } from '../audits/audits.service';
import { RankTrackingService } from '../keywords/rank-tracking.service';
import { CompetitorsService } from '../competitors/competitors.service';
import type { ProjectOverview } from '../types/shared';

@Injectable()
export class ProjectsOverviewService {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly auditsService: AuditsService,
    private readonly rankTrackingService: RankTrackingService,
    private readonly competitorsService: CompetitorsService,
  ) {}

  async getOverview(projectId: string): Promise<ProjectOverview> {
    const project = await this.projectsService.findById(projectId);

    const [lastAuditResult, rankingsResult, competitorsResult] = await Promise.all([
      this.fetchLastAudit(projectId),
      this.fetchRankings(projectId),
      this.fetchCompetitors(projectId),
    ]);

    return {
      project: {
        id: project.id,
        name: project.name,
        domain: project.domain,
        countryCode: project.countryCode,
      },
      lastAudit: lastAuditResult,
      rankings: rankingsResult,
      competitors: competitorsResult,
    };
  }

  private async fetchLastAudit(projectId: string) {
    try {
      const audits = await this.auditsService.listAuditsForProject(projectId);
      const done = audits.filter(a => a.status === 'done');
      if (done.length === 0) return null;

      const latest = done[0];
      const issues = await this.auditsService.getAuditIssues(latest.id);
      return {
        id: latest.id,
        scoreGlobal: latest.score ?? 0,
        categories: latest.categoryScores ?? {},
        issuesCount: issues.length,
        pagesCrawled: latest.pagesCrawled,
        createdAt: latest.createdAt.toISOString(),
        status: latest.status,
      };
    } catch {
      return null;
    }
  }

  private async fetchRankings(projectId: string) {
    try {
      return await this.rankTrackingService.getProjectSummary(projectId);
    } catch {
      return { totalKeywords: 0, avgPosition: null, gained30d: 0, lost30d: 0 };
    }
  }

  private async fetchCompetitors(projectId: string) {
    try {
      const overview = await this.competitorsService.getOverview(projectId);
      return {
        projectKeywordsTop10: overview.projectKeywordsTop10,
        competitorComparison: overview.competitors.map(c => ({
          id: c.id,
          domain: c.domain,
          top10: c.keywordsTop10,
        })),
      };
    } catch {
      return { projectKeywordsTop10: 0, competitorComparison: [] };
    }
  }
}
