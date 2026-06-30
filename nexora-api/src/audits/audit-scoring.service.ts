import { Injectable } from '@nestjs/common';
import { AuditIssue } from './entities/audit-issue.entity';

const RULES: Record<string, { cat: string; impact: number }> = {
  http_error:                 { cat: 'technical',    impact: 3 },
  redirect_chain:             { cat: 'technical',    impact: 2 },
  missing_canonical:          { cat: 'technical',    impact: 2 },
  missing_title:              { cat: 'onpage',       impact: 2 },
  duplicate_title:            { cat: 'onpage',       impact: 1 },
  missing_meta_description:   { cat: 'onpage',       impact: 1 },
  missing_h1:                 { cat: 'onpage',       impact: 1 },
  thin_content:               { cat: 'onpage',       impact: 1 },
  blocked_by_robots:          { cat: 'crawlability', impact: 3 },
  noindex:                    { cat: 'crawlability', impact: 3 },
  deep_page:                  { cat: 'crawlability', impact: 2 },
  duplicate_content:          { cat: 'content',      impact: 3 },
  near_duplicate:             { cat: 'content',      impact: 2 },
  orphan_page:                { cat: 'content',      impact: 2 },
  weak_internal_links:        { cat: 'content',      impact: 1 },
};

@Injectable()
export class AuditScoringService {
  computeExpertScore(
    issues: AuditIssue[],
    metrics: { lighthouse?: number | null },
  ): { global: number; categories: Record<string, number> } {
    const score: Record<string, number> = {
      technical: 30,
      onpage: 25,
      performance: 20,
      crawlability: 15,
      content: 10,
    };

    for (const issue of issues) {
      const rule = RULES[issue.type];
      if (rule) {
        score[rule.cat] -= rule.impact;
      }
    }

    if (metrics.lighthouse != null) {
      if (metrics.lighthouse < 30) score.performance -= 10;
      else if (metrics.lighthouse < 50) score.performance -= 6;
      else if (metrics.lighthouse < 70) score.performance -= 4;
      else if (metrics.lighthouse < 90) score.performance -= 2;
    }

    for (const key of Object.keys(score)) {
      if (score[key] < 0) score[key] = 0;
    }

    const global = score.technical + score.onpage + score.performance
                 + score.crawlability + score.content;

    return { global, categories: score };
  }
}
