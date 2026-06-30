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

// V2 Types - Agence Reports

export type Agency = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  customDomain: string | null;
  ownerUserId: string;
  createdAt: string;
};

export type AgencyMember = {
  id: string;
  agencyId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  user?: { id: string; email: string; name: string | null };
  createdAt: string;
};

export type ClientUser = {
  id: string;
  agencyId: string;
  name: string | null;
  email: string;
  active: boolean;
  createdAt: string;
};

export type Brand = {
  id: string;
  agencyId: string;
  name: string;
  logoUrl: string | null;
  colors: Record<string, string>;
  domain: string | null;
  createdAt: string;
};

export type AiSearchData = {
  visibilityScore: number;
  snapshots: { id: string; prompt: string; present: boolean; source: string }[];
  opportunities: { prompt: string; source: string }[];
};

export type GrowthData = {
  pages: { url: string; delta: number; status: string }[];
  keywords: { keyword: string; position: number; change: number }[];
  backlinks: { source: string; impact: number; type: string }[];
  potentialScore: number;
};

export type ReportV2 = {
  id: string;
  projectId: string;
  periodType: 'weekly' | 'monthly' | 'quarterly';
  seoScore: number | null;
  aiScore: number | null;
  growthScore: number | null;
  narrative: string | null;
  recommendations: { title: string; description: string; priority: string; impact: string }[];
  scores: Record<string, number>;
  pdfPath: string | null;
  signedUrl: string | null;
  createdAt: string;
};

export type AssistantResponse = {
  answer: string;
  context: Record<string, unknown>;
};
