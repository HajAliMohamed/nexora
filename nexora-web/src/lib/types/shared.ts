export type PlanLimits = {
  maxProjects: number;
  maxKeywords: number;
  maxPagesPerAudit: number;
  maxAuditsPerMonth: number;
  maxCompetitorsPerProject: number;
  maxKeywordSearchesPerDay: number;
  historyDays: number;
  pdfExport: boolean;
  whiteLabel: boolean;
};

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    maxProjects: 1, maxKeywords: 20, maxPagesPerAudit: 100,
    maxAuditsPerMonth: 1, maxCompetitorsPerProject: 1,
    maxKeywordSearchesPerDay: 5, historyDays: 30,
    pdfExport: false, whiteLabel: false,
  },
  pro: {
    maxProjects: 5, maxKeywords: 500, maxPagesPerAudit: 500,
    maxAuditsPerMonth: 10, maxCompetitorsPerProject: 5,
    maxKeywordSearchesPerDay: 50, historyDays: 180,
    pdfExport: true, whiteLabel: false,
  },
  agency: {
    maxProjects: 20, maxKeywords: 5000, maxPagesPerAudit: 2000,
    maxAuditsPerMonth: 9999, maxCompetitorsPerProject: 10,
    maxKeywordSearchesPerDay: 500, historyDays: 730,
    pdfExport: true, whiteLabel: true,
  },
};

export type Project = {
  id: string;
  name: string;
  domain: string;
  countryCode: string;
  languageCode: string;
  createdAt: string;
};

export type SiteAudit = {
  id: string;
  projectId: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  score: number | null;
  categoryScores: Record<string, number> | null;
  pagesCrawled: number;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
};

export type AuditIssue = {
  id: string;
  auditId: string;
  url: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  extra?: Record<string, unknown>;
};

export type Keyword = {
  id: string;
  projectId: string;
  keyword: string;
  countryCode: string;
  languageCode: string;
  device: 'desktop' | 'mobile';
  createdAt: string;
};

export type VisibilityPoint = { date: string; score: number };

export type KeywordWithPosition = {
  id: string;
  keyword: string;
  countryCode: string;
  languageCode: string;
  device: string;
  createdAt: string;
  currentPosition: number | null;
  change7d: number | null;
  lastChecked: string | null;
};

export type GainsLosses = {
  gains: { keyword: string; from: number; to: number; change: number }[];
  losses: { keyword: string; from: number; to: number; change: number }[];
};

export type KeywordResearchResult = {
  keyword: string;
  volume: number;
  cpc: number;
  difficulty: number;
  competition: number;
};

export type CompetitorOverview = {
  projectKeywordsTop10: number;
  projectEstimatedTraffic: number;
  competitors: {
    id: string;
    domain: string;
    keywordsTop10: number;
    estimatedTraffic: number;
  }[];
};

export type KeywordDiffResult = {
  keyword: string;
  yourPosition: number | null;
  competitorPositions: { domain: string; position: number | null }[];
};

export type ProjectOverview = {
  project: { id: string; name: string; domain: string; countryCode: string };
  lastAudit: {
    id: string;
    scoreGlobal: number;
    categories: Record<string, number>;
    issuesCount: number;
    pagesCrawled: number;
    createdAt: string;
    status: string;
  } | null;
  rankings: {
    totalKeywords: number;
    avgPosition: number | null;
    gained30d: number;
    lost30d: number;
  };
  competitors: {
    projectKeywordsTop10: number;
    competitorComparison: { id: string; domain: string; top10: number }[];
  };
};

export type KeywordPosition = {
  id: string;
  keywordId: string;
  date: string;
  position: number | null;
  url?: string;
};

export type SeoAlert = {
  id: string;
  userId: string;
  projectId: string;
  type: 'ranking_gain' | 'ranking_drop' | 'audit_score_drop';
  payload: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
};
