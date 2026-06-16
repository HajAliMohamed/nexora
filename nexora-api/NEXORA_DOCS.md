# Nexora — Technical Documentation

> SEO SaaS platform (Semrush-like MVP) — Full build reference for opencode

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Database Schema (PostgreSQL)](#4-database-schema)
5. [Backend Modules (NestJS)](#5-backend-modules)
6. [API Endpoints Reference](#6-api-endpoints)
7. [Background Jobs & Queues (BullMQ)](#7-background-jobs--queues)
8. [SEO Audit Pipeline](#8-seo-audit-pipeline)
9. [Rank Tracking Pipeline](#9-rank-tracking-pipeline)
10. [SEO Scoring System](#10-seo-scoring-system)
11. [Duplicate Content Detection](#11-duplicate-content-detection)
12. [Internal Linking & Depth Analysis](#12-internal-linking--depth-analysis)
13. [Keyword Research Module](#13-keyword-research-module)
14. [Competitive Analysis Module](#14-competitive-analysis-module)
15. [SEO Alerts System](#15-seo-alerts-system)
16. [Billing & Plan Quotas](#16-billing--plan-quotas)
17. [Frontend Pages (Next.js)](#17-frontend-pages-nextjs)
18. [Shared TypeScript Types](#18-shared-typescript-types)
19. [Environment Variables](#19-environment-variables)
20. [6-Week Development Roadmap](#20-6-week-development-roadmap)
21. [Full Backlog (Epics & Tickets)](#21-full-backlog)
22. [Architecture Diagram](#22-architecture-diagram)

---

## 1. Project Overview

**Nexora** is a SaaS SEO platform targeting freelancers, small agencies, and SMEs — a focused, usable alternative to Semrush, initially optimized for France/francophone markets.

### Core Modules

| Module | Description |
|---|---|
| **Site Audit** | Crawl a domain, detect on-page, technical, and performance issues, generate a scored report |
| **Rank Tracking** | Track keyword positions via SERP API, store daily history, show trends |
| **Keyword Research** | Query volume, CPC, difficulty, and suggestions from an external provider |
| **Competitive Analysis** | Compare your domain against 2–3 competitors on keyword overlap, estimated traffic |
| **SEO Alerts** | Notify users of significant ranking gains/drops via a background job |

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui |
| Charts | Recharts or Chart.js |
| State/Data | TanStack Query (React Query) |
| Backend | NestJS + TypeScript |
| ORM | TypeORM (or Prisma) |
| Database | PostgreSQL |
| Job Queue | BullMQ + Redis |
| Scheduling | `@nestjs/schedule` (cron) |
| Auth | JWT + Refresh Tokens (cookie-based) |
| Payments | Stripe (subscriptions + webhooks) |
| SERP API | DataForSEO / SerpApi / Zenserp (configurable) |
| Keywords API | DataForSEO Keywords or similar provider |
| Performance API | Google PageSpeed Insights (Lighthouse) |
| PDF Reports | Puppeteer (HTML → PDF) |
| Monitoring | Sentry + Logtail/Datadog |
| Deployment | Frontend: Vercel — API: Render/Railway/AWS — DB: Neon/Supabase/RDS |

---

## 3. Monorepo Structure

```
nexora/
  apps/
    web/                        # Next.js (App Router)
      app/
        (marketing)/            # Landing, pricing, blog
        (app)/
          dashboard/
          projects/
          projects/[projectId]/
            page.tsx            # Project overview dashboard
            audits/
            rankings/
            competitors/
          keyword-research/
          alerts/
          billing/
      components/
      lib/
      public/
    api/                        # NestJS backend
      src/
        main.ts
        app.module.ts
        common/                 # Guards, interceptors, pipes
        auth/
        users/
        projects/
        audits/
        keywords/               # rank-tracking
        serp/
        competitors/
        keyword-research/
        billing/
        reports/
        alerts/
        queue/
  packages/
    ui/                         # Shared React components
    types/                      # Shared TypeScript types
    config/                     # eslint, tsconfig base
  prisma/                       # OR db/migrations/
  docker/
    api/
    web/
    db/
  docker-compose.yml
  .env.example
  README.md
```

---

## 4. Database Schema

### 4.1 Users & Auth

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  refresh_token TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);
```

### 4.2 Billing & Subscriptions

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL,           -- free | pro | agency
  limits JSONB NOT NULL,        -- { maxProjects, maxKeywords, maxPagesPerAudit, maxAuditsPerMonth }
  status TEXT NOT NULL,         -- active | canceled | trialing
  current_period_end TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 4.3 Projects & Competitors

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  country_code TEXT NOT NULL,
  language_code TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  domain TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 4.4 Site Audits

```sql
CREATE TABLE site_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  status TEXT NOT NULL,         -- pending | running | done | failed
  score INTEGER,                -- global score 0–100
  category_scores JSONB,        -- { technical, onpage, performance, crawlability, content }
  pages_crawled INTEGER DEFAULT 0,
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID REFERENCES site_audits(id),
  url TEXT NOT NULL,
  type TEXT NOT NULL,           -- missing_title | http_error | orphan_page | etc.
  severity TEXT NOT NULL,       -- critical | high | medium | low
  message TEXT NOT NULL,
  extra JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 4.5 Keywords & Positions

```sql
CREATE TABLE keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  keyword TEXT NOT NULL,
  country_code TEXT NOT NULL,
  language_code TEXT NOT NULL,
  device TEXT NOT NULL,         -- desktop | mobile
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE keyword_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id UUID REFERENCES keywords(id),
  date DATE NOT NULL,
  position INTEGER,
  url TEXT,
  serp_features JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 4.6 SEO Alerts

```sql
CREATE TABLE seo_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  type TEXT NOT NULL,           -- ranking_gain | ranking_drop | audit_score_drop
  payload JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  read_at TIMESTAMP
);
```

---

## 5. Backend Modules

### 5.1 AuthModule

**File:** `src/auth/`

Responsibilities:
- JWT access tokens + refresh tokens (stored in HTTP-only cookies)
- `AuthGuard` — used on all protected routes
- Password reset flow (token + email)

Key files:
- `auth.service.ts` — signup, login, token refresh, password reset
- `auth.controller.ts` — exposes HTTP endpoints
- `auth.guard.ts` — NestJS guard injected in all protected controllers

---

### 5.2 ProjectsModule

**File:** `src/projects/`

```typescript
// projects.controller.ts
@Get('projects/:projectId/overview')
async overview(@Param('projectId') projectId: string) {
  return this.overviewService.getOverview(projectId);
}
```

`ProjectsOverviewService.getOverview(projectId)` returns:
```typescript
{
  lastAudit: { scoreGlobal, categories, issuesCount, createdAt },
  rankings: { totalKeywords, avgPosition, gained30d, lost30d },
  competitors: { projectTop10, competitorComparison }
}
```

---

### 5.3 AuditsModule

**File:** `src/audits/`

Services:
- `AuditsService` — CRUD for audits and issues, `markRunning`, `markDone`, `addIssue`, `getAuditIssues`
- `CrawlerService` — BFS crawl with Cheerio, extracts title/meta/H1/links
- `AuditScoringService` — computes weighted expert score
- `DuplicateContentService` — shingle-based Jaccard similarity detection
- `DepthService` — BFS depth map from root URL
- `InternalLinkingService` — in-degree graph, orphan pages, weak linking
- `AuditsProcessor` (BullMQ) — orchestrates the full audit pipeline

**Crawler service outline:**

```typescript
// crawler.service.ts
async crawlDomain(domain: string, maxPages = 200): Promise<CrawlResult[]>
// BFS over internal links, extracts: statusCode, title, metaDescription, h1, html, outgoingLinks
```

**Audit processor flow:**
1. `markRunning(auditId)`
2. `crawlDomain(domain, maxPages)` → list of pages
3. For each page: detect HTTP errors, missing title/H1/meta
4. Run `DuplicateContentService.detectDuplicates(pages)`
5. Run `DepthService.computeDepth(pages, rootUrl)` → flag deep pages (≥4 clicks)
6. Run `InternalLinkingService.analyze(pages)` → flag orphan pages
7. `AuditScoringService.computeExpertScore(issues, metrics)` → global + category scores
8. `markDone(auditId, score, pagesCrawled)`

---

### 5.4 RankTrackingModule

**File:** `src/keywords/`

Services:
- `RankTrackingService` — addKeyword, listKeywords, addPosition, getPositions, getBigChanges
- `SerpService` — wraps external SERP API (DataForSEO/SerpApi), returns `{ position, url }`
- `RankTrackingProcessor` (BullMQ) — per-keyword job that calls SERP + stores position
- `RankTrackingCron` — daily cron (`0 3 * * *`) that enqueues all keywords

**SerpService pattern:**

```typescript
async getRanking(params: {
  keyword: string; domain: string;
  countryCode: string; languageCode: string;
  device: 'desktop' | 'mobile';
}): Promise<{ position: number | null; url?: string }>
// Calls provider API, searches organic results for domain match
```

---

### 5.5 BillingModule

**File:** `src/billing/`

Services:
- `SubscriptionsService` — getActiveSubscription, upsert on Stripe webhook
- `LimitsService` — quota enforcement:
  - `ensureCanCreateProject(userId)`
  - `ensureCanAddKeyword(userId)`
  - `ensureCanRunAudit(userId)`
  - `getMaxPagesPerAudit(userId): Promise<number>`

Limits are stored as JSONB in the `subscriptions` table:
```json
{
  "maxProjects": 5,
  "maxKeywords": 500,
  "maxPagesPerAudit": 500,
  "maxAuditsPerMonth": 10
}
```

---

### 5.6 AlertsModule

**File:** `src/alerts/`

- `AlertsService` — `createAlert`, `listForUser`
- `RankAlertsProcessor` — consumes `check-rank-changes` jobs, calls `getBigChanges`, stores alerts
- `AlertsCron` — daily cron (`0 6 * * *`) enqueues all projects

---

## 6. API Endpoints

### Auth
```
POST  /auth/signup
POST  /auth/login
POST  /auth/refresh
POST  /auth/logout
POST  /auth/forgot-password
POST  /auth/reset-password
```

### Me
```
GET   /me
```

### Billing
```
POST  /billing/create-checkout-session
POST  /billing/create-portal-session
POST  /billing/webhook          ← Stripe webhook (unauthenticated)
```

### Projects
```
GET   /projects
POST  /projects
GET   /projects/:id
PATCH /projects/:id
DELETE /projects/:id
GET   /projects/:id/overview
```

### Competitors
```
GET   /projects/:id/competitors
POST  /projects/:id/competitors
DELETE /projects/:id/competitors/:competitorId
GET   /projects/:id/competitors/overview
GET   /projects/:id/competitors/keywords-diff
```

### Audits
```
POST  /projects/:id/audits          ← triggers async audit job
GET   /projects/:id/audits
GET   /audits/:auditId
GET   /audits/:auditId/issues       ← ?severity=&type=
```

### Rank Tracking
```
POST  /projects/:id/keywords
GET   /projects/:id/keywords
DELETE /keywords/:id
GET   /keywords/:id/positions       ← ?from=YYYY-MM-DD&to=YYYY-MM-DD
GET   /projects/:id/keywords/summary
```

### Keyword Research
```
GET   /keyword-research/search      ← ?query=&country=&language=
POST  /keyword-research/add-to-project
```

### Reports
```
GET   /reports/audit/:auditId/pdf
GET   /reports/project/:projectId/rankings/pdf
```

### Alerts
```
GET   /alerts
PATCH /alerts/:id/read
```

---

## 7. Background Jobs & Queues

### Queue: `audits`

**Job: `run-audit`**
- Payload: `{ auditId: string; projectId: string; maxPages: number }`
- Processor: `AuditsProcessor`
- Flow: crawl → detect issues → score → markDone

**Enqueue from controller:**
```typescript
await this.auditsQueue.add('run-audit', { auditId, projectId, maxPages }, { attempts: 1 });
```

---

### Queue: `rank-tracking`

**Job: `refresh-keyword`**
- Payload: `{ keywordId: string }`
- Processor: `RankTrackingProcessor`
- Flow: load keyword → get project domain → call SerpService → addPosition

**Daily enqueue (cron at 03:00):**
```typescript
@Cron('0 3 * * *')
async enqueueDailyRefresh() {
  const keywords = await this.rankService.getAllKeywords();
  for (const kw of keywords) {
    await this.rankQueue.add('refresh-keyword', { keywordId: kw.id }, { attempts: 3 });
  }
}
```

---

### Queue: `alerts`

**Job: `check-rank-changes`**
- Payload: `{ projectId: string; userId: string }`
- Processor: `RankAlertsProcessor`
- Flow: `getBigChanges(projectId, 10)` → create `ranking_gain` / `ranking_drop` alerts

**Daily enqueue (cron at 06:00):**
```typescript
@Cron('0 6 * * *')
async enqueueChecks() {
  const projects = await this.projectsService.getAllWithOwners();
  for (const p of projects) {
    await this.alertsQueue.add('check-rank-changes', { projectId: p.id, userId: p.userId });
  }
}
```

---

## 8. SEO Audit Pipeline

### Full Audit Processor

```typescript
// audits.processor.ts
@Processor('audits')
export class AuditsProcessor {
  @Process('run-audit')
  async handleRunAudit(job: Job<{ auditId: string; projectId: string; maxPages: number }>) {
    const { auditId, projectId, maxPages } = job.data;

    await this.auditsService.markRunning(auditId);
    const project = await this.projectsService.getById(projectId);
    const pages = await this.crawler.crawlDomain(project.domain, maxPages);
    const startUrl = `https://${project.domain}`;

    // Basic checks per page
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
    }

    // Depth analysis
    const depthMap = this.depthService.computeDepth(
      pages.map(p => ({ url: p.url, outgoing: p.outgoingLinks })), startUrl
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

    // Internal linking analysis
    const linking = this.internalLinkingService.analyze(
      pages.map(p => ({ url: p.url, outgoing: p.outgoingLinks }))
    );
    for (const url of linking.orphanPages) {
      await this.auditsService.addIssue(auditId, {
        url, type: 'orphan_page', severity: 'high',
        message: 'Page with no internal inbound links',
      });
    }

    // Duplicate content
    const textPages = pages
      .filter(p => p.html)
      .map(p => ({ url: p.url, text: extractMainText(p.html) }));
    const duplicates = this.duplicateContentService.detectDuplicates(textPages);
    for (const dup of duplicates) {
      await this.auditsService.addIssue(auditId, {
        url: dup.urlA, type: 'duplicate_content', severity: 'high',
        message: `Duplicate content with ${dup.urlB} (${(dup.similarity * 100).toFixed(1)}% similarity)`,
      });
    }

    // Score
    const issues = await this.auditsService.getAuditIssues(auditId);
    const lighthouseScore = await this.getPageSpeedScore(project.domain);
    const scoring = this.scoringService.computeExpertScore(issues, { lighthouse: lighthouseScore });

    await this.auditsService.markDone(auditId, scoring.global, pages.length);
  }
}
```

---

## 9. Rank Tracking Pipeline

```typescript
// rank-tracking.processor.ts
@Processor('rank-tracking')
export class RankTrackingProcessor {
  @Process('refresh-keyword')
  async handleRefreshKeyword(job: Job<{ keywordId: string }>) {
    const keyword = await this.rankService.getKeywordById(job.data.keywordId);
    if (!keyword) return;

    const project = await this.rankService.getProjectById(keyword.projectId);

    const result = await this.serpService.getRanking({
      keyword: keyword.keyword,
      domain: project.domain,
      countryCode: keyword.countryCode,
      languageCode: keyword.languageCode,
      device: keyword.device,
    });

    await this.rankService.addPosition(keyword.id, {
      date: new Date(),
      position: result.position,
      url: result.url,
      serpFeatures: {},
    });
  }
}
```

---

## 10. SEO Scoring System

The expert scoring system uses **100 points** distributed across 5 categories:

| Category | Max Points | Weight |
|---|---|---|
| Technical | 30 | HTTP codes, redirects, canonicals |
| On-page | 25 | Title, meta, H1, content quality |
| Performance | 20 | Lighthouse score |
| Crawlability | 15 | robots.txt, noindex, depth |
| Content | 10 | Duplicate content, thin content, orphan pages |

### Issue → Category Mapping

```typescript
const rules = {
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
};
```

### Lighthouse Performance Scale

| Lighthouse Score | Penalty |
|---|---|
| 0–29 | -10 |
| 30–49 | -6 |
| 50–69 | -4 |
| 70–89 | -2 |
| 90–100 | 0 |

### Score Computation

```typescript
computeExpertScore(issues: AuditIssue[], metrics: { lighthouse: number }) {
  let score = { technical: 30, onpage: 25, performance: 20, crawlability: 15, content: 10 };

  for (const issue of issues) {
    const rule = rules[issue.type];
    if (rule) score[rule.cat] -= rule.impact;
  }

  // Lighthouse penalty
  if (metrics.lighthouse < 30) score.performance -= 10;
  else if (metrics.lighthouse < 50) score.performance -= 6;
  else if (metrics.lighthouse < 70) score.performance -= 4;
  else if (metrics.lighthouse < 90) score.performance -= 2;

  // Clamp all categories to 0
  for (const key of Object.keys(score)) {
    if (score[key] < 0) score[key] = 0;
  }

  const global = score.technical + score.onpage + score.performance
               + score.crawlability + score.content;

  return { global, categories: score };
}
```

---

## 11. Duplicate Content Detection

Uses **shingling + Jaccard similarity** with a default threshold of 0.85.

```typescript
// duplicate-content.service.ts
detectDuplicates(pages: { url: string; text: string }[], threshold = 0.85) {
  // 1. Tokenize text into shingles (5-word sliding windows)
  // 2. Hash each shingle (MD5)
  // 3. For each page pair: compute Jaccard(setA, setB)
  // 4. If similarity >= threshold → flag as duplicate_content issue
}
```

`extractMainText(html)` can start as `$('body').text()` via Cheerio and be refined later.

---

## 12. Internal Linking & Depth Analysis

### Depth Service (BFS)

```typescript
// depth.service.ts
computeDepth(pages: { url: string; outgoing: string[] }[], rootUrl: string): Record<string, number>
// Returns a map of URL → click depth from root
// Pages at depth >= 4 → 'deep_page' issue
```

### Internal Linking Service

```typescript
// internal-linking.service.ts
analyze(pages: { url: string; outgoing: string[] }[]) {
  // Returns: { inDegree, outDegree, orphanPages, weakLinked }
  // orphanPages = pages with inDegree === 0 → 'orphan_page' issue
  // weakLinked = pages with inDegree 1–2 → 'weak_internal_links' issue
}
```

---

## 13. Keyword Research Module

```typescript
// keyword-research.service.ts
async search(query: string, countryCode: string, languageCode: string) {
  // Calls external keyword provider (DataForSEO, etc.)
  // Returns: [{ keyword, volume, cpc, difficulty }]
}
```

**Endpoint:** `GET /keyword-research/search?query=...&country=fr&language=fr`

**Response:**
```json
[
  { "keyword": "référencement naturel", "volume": 5400, "cpc": 2.10, "difficulty": 64 },
  ...
]
```

**Redis caching** recommended to reduce API costs — cache results by `query:country:language` key with a TTL of 24h.

---

## 14. Competitive Analysis Module

```typescript
// competitors.service.ts
async getOverview(projectId: string) {
  const keywords = await this.keywordsRepo.find({ where: { projectId } });
  const keywordIds = keywords.map(k => k.id);
  const projectTop10 = await this.positionsRepo
    .createQueryBuilder('pos')
    .where('pos.keywordId IN (:...keywordIds)', { keywordIds })
    .andWhere('pos.position <= 10')
    .getCount();

  return { projectKeywordsTop10: projectTop10, competitors: [] };
  // competitors array to be populated by SERP data for competitor domains
}
```

**Planned endpoint:** `GET /projects/:id/competitors/keywords-diff`
Returns keywords where competitors rank higher than the project domain.

---

## 15. SEO Alerts System

### Alert Types
- `ranking_gain` — keyword moved up significantly (threshold: 10 positions)
- `ranking_drop` — keyword dropped significantly
- `audit_score_drop` — (future) audit score decreased vs. previous audit

### Flow

```
AlertsCron (daily 06:00)
  → enqueue check-rank-changes for each project
    → RankAlertsProcessor
      → RankTrackingService.getBigChanges(projectId, threshold=10)
        → AlertsService.createAlert(...)
```

### Frontend (alerts page)
```
GET /alerts → list of SeoAlert objects
PATCH /alerts/:id/read → mark as read
```

---

## 16. Billing & Plan Quotas

### Plans

| Plan | Price | Projects | Keywords | Audits/month | Pages/audit | Competitors | KW Searches/day |
|---|---|---|---|---|---|---|---|
| **Free** | €0 | 1 | 20 | 1 | 100 | 1 | 5 |
| **Pro** | €39/mo | 5 | 500 | 10 | 500 | 5/project | 50 |
| **Agency** | €99/mo | 20 | 5000 | Unlimited* | 2000 | 10/project | 500 |

*Fair use policy on Agency audits.

### Limits JSONB examples

**Free:**
```json
{ "maxProjects": 1, "maxKeywords": 20, "maxPagesPerAudit": 100, "maxAuditsPerMonth": 1 }
```

**Pro:**
```json
{ "maxProjects": 5, "maxKeywords": 500, "maxPagesPerAudit": 500, "maxAuditsPerMonth": 10 }
```

**Agency:**
```json
{ "maxProjects": 20, "maxKeywords": 5000, "maxPagesPerAudit": 2000, "maxAuditsPerMonth": 9999 }
```

### Enforcement pattern (in controllers)

```typescript
@Post('projects/:projectId/audits')
async createAudit(@Param('projectId') projectId: string, @Req() req: any) {
  const userId = req.user.id;
  await this.limitsService.ensureCanRunAudit(userId);          // throws 403 if over limit
  const maxPages = await this.limitsService.getMaxPagesPerAudit(userId);
  const audit = await this.auditsService.createAudit(projectId);
  await this.auditsQueue.add('run-audit', { auditId: audit.id, projectId, maxPages });
  return audit;
}
```

---

## 17. Frontend Pages (Next.js)

### Page Structure

```
app/(app)/
  dashboard/page.tsx                    → list of all projects + global KPIs
  projects/[projectId]/page.tsx         → project overview (audit + rankings + competitors)
  projects/[projectId]/audits/page.tsx  → list audits, trigger new audit, view issues
  projects/[projectId]/rankings/page.tsx → keywords table + position history chart
  projects/[projectId]/competitors/page.tsx → add/remove competitors, overview
  keyword-research/page.tsx             → search form + results table
  alerts/page.tsx                       → list of SEO alerts
  billing/page.tsx                      → plan info, upgrade CTA, Stripe portal
```

### Project Overview Dashboard (key component)

The `GET /projects/:id/overview` endpoint feeds the main dashboard:

```typescript
type Overview = {
  lastAudit: {
    id: string;
    scoreGlobal: number;                      // 0–100
    categories: {                             // each 0–100 mapped to max pts
      technical: number;
      onpage: number;
      performance: number;
      crawlability: number;
      content: number;
    };
    issuesCount: number;
    createdAt: string;
  } | null;
  rankings: {
    totalKeywords: number;
    avgPosition: number | null;
    gained30d: number;
    lost30d: number;
  };
  competitors: {
    projectTop10: number;
    competitorComparison: { name: string; top10: number }[];
  };
};
```

---

## 18. Shared TypeScript Types

Place in `packages/types/index.ts`:

```typescript
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
  projectId: string;
  type: 'ranking_gain' | 'ranking_drop' | 'audit_score_drop';
  payload: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
};
```

---

## 19. Environment Variables

```bash
# .env.example

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/nexora

# Redis (BullMQ)
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# External APIs
SERP_API_KEY=your_serp_api_key
KEYWORDS_API_KEY=your_keywords_api_key
PAGESPEED_API_KEY=your_google_pagespeed_key   # optional, free tier available

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:3001

# Monitoring (optional)
SENTRY_DSN=https://...
```

---

## 20. 6-Week Development Roadmap

### Week 1 — Foundations & Auth
- Monorepo setup (Turborepo or Nx)
- NestJS: AuthModule (JWT, signup/login/refresh/logout, reset password), UsersModule, ProjectsModule (CRUD)
- PostgreSQL + initial migrations
- Next.js: auth pages (login, signup, reset), layout, project CRUD UI
- Stripe: products/plans setup, webhooks, subscriptions table, LimitsService skeleton
- **Deliverable:** Working auth + projects + Stripe connected + empty dashboard

### Week 2 — SEO Audit Module
- CrawlerService (BFS, Cheerio, robots.txt, link extraction)
- On-page checks: title, meta description, H1
- Technical checks: HTTP codes, canonicals
- PageSpeed Insights API integration
- BullMQ `audits` queue + `run-audit` processor
- AuditScoringService (basic then expert)
- Next.js: audit list page, audit detail page (issues table with filters)
- **Deliverable:** Full SEO audit pipeline, exploitable UI

### Week 3 — Rank Tracking
- SerpService (SERP provider integration)
- Keywords CRUD + positions storage
- BullMQ `rank-tracking` queue + `refresh-keyword` processor
- Daily cron for all keywords
- Next.js: rankings page (table + position history chart with Recharts)
- **Deliverable:** Working rank tracking with daily refresh + evolution charts

### Week 4 — Keyword Research
- KeywordResearchService (external provider)
- Redis cache for results
- Plan-based rate limiting (X searches/day)
- Next.js: keyword research page (search form + filterable results table + "Add to project" button)
- **Deliverable:** Fully working keyword research module

### Week 5 — Competitive Analysis + Reports
- CompetitorsService (CRUD + overview)
- Keyword overlap analysis (when competitor SERP data available)
- PDF report generation (Puppeteer): audit report + rankings report
- Next.js: competitors page + PDF export buttons
- **Deliverable:** Competitive analysis + exportable PDF reports

### Week 6 — Polish, Onboarding, Deployment
- DuplicateContentService, DepthService, InternalLinkingService integrated into audit processor
- AlertsModule (rank alerts cron + alerts page)
- Onboarding wizard (create project → add keywords → first audit)
- Landing page (pricing, features, CTA)
- Sentry + Logtail monitoring
- Docker Compose finalization
- Deployment (Vercel + Render/Railway, Neon DB)
- **Deliverable:** Shippable, sellable product

---

## 21. Full Backlog

### Epic: Auth & Users
- AUTH-1: NestJS AuthModule (JWT + refresh)
- AUTH-2: Endpoints signup / login / logout
- AUTH-3: Reset password (token + email)
- AUTH-4: Route protection middleware (AuthGuard)
- AUTH-5: Next.js auth integration (interceptors, cookies)
- AUTH-6: Login / Signup / Reset pages

### Epic: Projects & Competitors
- PROJ-1: Projects entity + migrations
- PROJ-2: CRUD projects (API + UI)
- PROJ-3: Add/remove competitors (API + UI)
- PROJ-4: Project overview page (traffic estimate, audits, keywords, competitors)

### Epic: Billing & Plans
- BILL-1: Create products/plans in Stripe
- BILL-2: Stripe webhook endpoint (subscription events)
- BILL-3: Subscriptions model + plan limits
- BILL-4: Pricing page + upgrade/downgrade flow
- BILL-5: Quota middleware (API)

### Epic: Site Audit
- AUDIT-1: `site_audits` + `audit_issues` entities
- AUDIT-2: CrawlerService (HTTP + HTML parsing)
- AUDIT-3: Respect robots.txt + page limit
- AUDIT-4: Technical checks (HTTP codes, canonicals, indexability)
- AUDIT-5: On-page checks (title, meta, H1, content length, basic duplicates)
- AUDIT-6: PageSpeed Insights API integration
- AUDIT-7: BullMQ job for async audit execution
- AUDIT-8: Audit list page + issue detail page
- AUDIT-9: Issue filters (type, severity, URL)
- AUDIT-10: DuplicateContentService (shingles + Jaccard)
- AUDIT-11: DepthService (BFS depth map)
- AUDIT-12: InternalLinkingService (orphan pages, weak links)
- AUDIT-13: AuditScoringService (expert 5-category scoring)

### Epic: Rank Tracking
- RANK-1: `keywords` + `keyword_positions` entities
- RANK-2: SERP provider integration (SerpService)
- RANK-3: Keyword creation endpoint
- RANK-4: Daily BullMQ job for position refresh
- RANK-5: Rankings page (table + evolution charts)
- RANK-6: Gained/lost view (period comparison)

### Epic: Keyword Research
- KW-1: KeywordResearchService (volume, CPC, difficulty, suggestions)
- KW-2: Search endpoint
- KW-3: Redis cache for results
- KW-4: Keyword research page (filterable table)
- KW-5: "Add to project" button → creates tracked keyword

### Epic: Competitive Analysis
- COMP-1: Keyword overlap computation (project vs competitors)
- COMP-2: `compare domains` endpoint
- COMP-3: Competitors page (charts + tables)
- COMP-4: List of keywords where competitors outrank the project

### Epic: Reports & Exports
- REP-1: Audit PDF generation (Puppeteer)
- REP-2: Rankings PDF generation
- REP-3: Export PDF buttons on audit and rankings pages

### Epic: SEO Alerts
- ALERT-1: `seo_alerts` entity
- ALERT-2: AlertsService (create, list, mark read)
- ALERT-3: RankAlertsProcessor (BullMQ)
- ALERT-4: AlertsCron (daily job enqueue)
- ALERT-5: Alerts page (list + mark as read)

### Epic: Onboarding & Marketing
- ONB-1: Guided onboarding wizard (project → keywords → audit)
- ONB-2: Landing page (hero, features, pricing, FAQ)
- ONB-3: Changelog / roadmap page
- ONB-4: Analytics tracking (Plausible / PostHog)

### Epic: Infra & Quality
- INFRA-1: Docker Compose (API + DB + Redis + web)
- INFRA-2: Deployment (Vercel + Render/Railway)
- INFRA-3: Sentry monitoring
- INFRA-4: Unit tests for critical services (scorer, crawler, limits)

---

## 22. Architecture Diagram

```
                    ┌────────────────────────────────────┐
                    │           FRONTEND                 │
                    │         Next.js App                │
                    │                                    │
                    │  Dashboard | Audits | Rankings     │
                    │  Competitors | KW Research         │
                    │  Alerts | Billing                  │
                    └──────────────┬─────────────────────┘
                                   │ REST / JSON (credentials: include)
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                        BACKEND NestJS (API)                      │
│                                                                  │
│  AuthModule           BillingModule        AlertsModule          │
│  (JWT, guards)        (Stripe, LimitsSvc)  (alerts, cron)        │
│                                                                  │
│  ProjectsModule                                                  │
│  (CRUD + overview endpoint aggregating all modules)              │
│                                                                  │
│  AuditsModule                                                    │
│  ├── CrawlerService       (BFS crawl + Cheerio HTML parsing)     │
│  ├── AuditScoringService  (5-category expert scoring)            │
│  ├── DuplicateContent     (shingles + Jaccard similarity)        │
│  ├── DepthService         (BFS click depth)                      │
│  └── InternalLinking      (in-degree graph, orphan pages)        │
│                                                                  │
│  RankTrackingModule                                              │
│  ├── Keywords / Positions CRUD                                   │
│  └── SerpService          (DataForSEO / SerpApi wrapper)         │
│                                                                  │
│  KeywordResearchModule    CompetitorsModule                      │
│  (provider proxy + cache) (CRUD + overview)                      │
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│  BullMQ Queues            Nest Schedule (crons)                  │
│  ├── audits               ├── 03:00 → enqueue rank refresh       │
│  │   └── run-audit        └── 06:00 → enqueue alert checks       │
│  ├── rank-tracking                                               │
│  │   └── refresh-keyword                                         │
│  └── alerts                                                      │
│      └── check-rank-changes                                      │
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│  PostgreSQL                    Redis                             │
│  (all data: users, projects,   (BullMQ jobs + KW search cache)   │
│   audits, keywords, alerts)                                      │
└──────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │    External Providers        │
                    │                             │
                    │  SERP API (DataForSEO, etc) │
                    │  Keywords API               │
                    │  Google PageSpeed API       │
                    │  Stripe                     │
                    └─────────────────────────────┘
```

---

*End of Nexora Technical Documentation*
