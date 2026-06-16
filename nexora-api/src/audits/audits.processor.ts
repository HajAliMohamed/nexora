import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as cheerio from 'cheerio';
import { AuditsService } from './audits.service';
import { CrawlerService } from './crawler.service';
import { AuditScoringService } from './audit-scoring.service';
import { DuplicateContentService } from './duplicate-content.service';
import { DepthService } from './depth.service';
import { InternalLinkingService } from './internal-linking.service';
import { PageSpeedService } from './pagespeed.service';
import { ProjectsService } from '../projects/projects.service';

@Processor('audits')
export class AuditsProcessor extends WorkerHost {
  constructor(
    private readonly auditsService: AuditsService,
    private readonly crawler: CrawlerService,
    private readonly scoringService: AuditScoringService,
    private readonly duplicateContentService: DuplicateContentService,
    private readonly depthService: DepthService,
    private readonly internalLinkingService: InternalLinkingService,
    private readonly pageSpeedService: PageSpeedService,
    private readonly projectsService: ProjectsService,
  ) {
    super();
  }

  async process(job: Job<{ auditId: string; projectId: string; maxPages: number }>): Promise<void> {
    const { auditId, projectId, maxPages } = job.data;

    try {
      await this.auditsService.markRunning(auditId);
      const project = await this.projectsService.findById(projectId);
      const domain = project.domain;
      const startUrl = `https://${domain}`;

      const pages = await this.crawler.crawlDomain(domain, maxPages);

      for (const page of pages) {
        if (page.statusCode >= 400) {
          await this.auditsService.addIssue(auditId, {
            url: page.url, type: 'http_error', severity: 'high',
            message: `HTTP ${page.statusCode}`,
          });
        }
        if (!page.title) {
          await this.auditsService.addIssue(auditId, {
            url: page.url, type: 'missing_title', severity: 'medium',
            message: 'Missing <title> tag',
          });
        }
        if (!page.metaDescription) {
          await this.auditsService.addIssue(auditId, {
            url: page.url, type: 'missing_meta_description', severity: 'low',
            message: 'Missing meta description',
          });
        }
        if (!page.h1) {
          await this.auditsService.addIssue(auditId, {
            url: page.url, type: 'missing_h1', severity: 'low',
            message: 'Missing <h1> tag',
          });
        }
        if (page.wordCount !== undefined && page.wordCount < 100) {
          await this.auditsService.addIssue(auditId, {
            url: page.url, type: 'thin_content', severity: 'medium',
            message: `Thin content (${page.wordCount} words)`,
          });
        }
        if (page.isNoindex) {
          await this.auditsService.addIssue(auditId, {
            url: page.url, type: 'noindex', severity: 'high',
            message: 'Page is set to noindex',
          });
        }
      }

      const depthMap = this.depthService.computeDepth(
        pages.map(p => ({ url: p.url, outgoing: p.outgoingLinks })), startUrl,
      );
      for (const page of pages) {
        const d = depthMap[page.url] ?? 0;
        if (d >= 4) {
          await this.auditsService.addIssue(auditId, {
            url: page.url, type: 'deep_page', severity: 'medium',
            message: `High click depth (${d} levels)`,
          });
        }
      }

      const linking = this.internalLinkingService.analyze(
        pages.map(p => ({ url: p.url, outgoing: p.outgoingLinks })),
      );
      for (const url of linking.orphanPages) {
        await this.auditsService.addIssue(auditId, {
          url, type: 'orphan_page', severity: 'high',
          message: 'Page with no internal inbound links',
        });
      }
      for (const wl of linking.weakLinked) {
        await this.auditsService.addIssue(auditId, {
          url: wl.url, type: 'weak_internal_links', severity: 'medium',
          message: `Only ${wl.inLinks} internal link(s) pointing to this page`,
        });
      }

      const textPages = pages
        .filter(p => p.html)
        .map(p => ({ url: p.url, text: this.extractMainText(p.html!) }));
      const duplicates = this.duplicateContentService.detectDuplicates(textPages);
      for (const dup of duplicates) {
        await this.auditsService.addIssue(auditId, {
          url: dup.urlA, type: 'duplicate_content', severity: 'high',
          message: `Duplicate content with ${dup.urlB} (${(dup.similarity * 100).toFixed(1)}% similarity)`,
        });
      }

      const lighthouseScore = await this.pageSpeedService.getScore(domain);
      const issues = await this.auditsService.getAuditIssues(auditId);
      const scoring = this.scoringService.computeExpertScore(issues, { lighthouse: lighthouseScore });

      await this.auditsService.markDone(auditId, scoring.global, scoring.categories, pages.length);
    } catch (error) {
      await this.auditsService.markFailed(auditId);
      throw error;
    }
  }

  private extractMainText(html: string): string {
    const $ = cheerio.load(html);
    return $('body').text();
  }
}
