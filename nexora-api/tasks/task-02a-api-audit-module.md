# Task 02a [API] — SEO Audit Module

> Repo: `nexora-api`
> Read `AGENTS.md` and `NEXORA_DOCS.md` sections 6, 7, 8, 10, 11, 12 before starting.
> Task 01a must be complete.

## Goal

Build the full SEO audit pipeline: trigger an audit, crawl the domain asynchronously, detect issues, score the result.

---

## Scope

### 1. Entities

**`SiteAudit` entity** (`src/audits/entities/site-audit.entity.ts`):
```typescript
@Entity('site_audits')
export class SiteAudit {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() projectId: string;
  @ManyToOne(() => Project) project: Project;
  @Column({ default: 'pending' }) status: string; // pending | running | done | failed
  @Column({ nullable: true }) score: number;
  @Column({ type: 'jsonb', nullable: true }) categoryScores: Record<string, number>;
  @Column({ default: 0 }) pagesCrawled: number;
  @Column({ nullable: true }) startedAt: Date;
  @Column({ nullable: true }) finishedAt: Date;
  @CreateDateColumn() createdAt: Date;
}
```

**`AuditIssue` entity** (`src/audits/entities/audit-issue.entity.ts`):
```typescript
@Entity('audit_issues')
export class AuditIssue {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() auditId: string;
  @Column() url: string;
  @Column() type: string;
  @Column() severity: string; // critical | high | medium | low
  @Column() message: string;
  @Column({ type: 'jsonb', nullable: true }) extra: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
}
```

Add corresponding types to `src/types/shared.ts` (`SiteAudit`, `AuditIssue`) — keep in sync with `nexora-web/lib/types/shared.ts`.

Generate and run migration.

### 2. AuditsService

File: `src/audits/audits.service.ts`

```typescript
createAudit(projectId: string, opts?: { maxPages?: number }): Promise<SiteAudit>
markRunning(auditId: string): Promise<void>
markDone(auditId: string, score: number, categoryScores: Record<string, number>, pagesCrawled: number): Promise<void>
markFailed(auditId: string): Promise<void>
addIssue(auditId: string, data: { url, type, severity, message, extra? }): Promise<AuditIssue>
getAudit(auditId: string): Promise<SiteAudit>
getAuditIssues(auditId: string, filters?: { severity?: string; type?: string }): Promise<AuditIssue[]>
listAuditsForProject(projectId: string): Promise<SiteAudit[]>
getLastAuditWithScores(projectId: string): Promise<SiteAudit | null>
countAuditsThisMonth(userId: string): Promise<number>
```

### 3. CrawlerService

File: `src/audits/crawler.service.ts`

Dependencies: `node-fetch`, `cheerio`

```typescript
type CrawlResult = {
  url: string;
  statusCode: number;
  title?: string;
  metaDescription?: string;
  h1?: string;
  html?: string;
  outgoingLinks: string[];
  wordCount?: number;
  canonical?: string;
  isNoindex?: boolean;
};

async crawlDomain(domain: string, maxPages: number): Promise<CrawlResult[]>
```

Crawler behavior:
- Normalize domain to `https://domain.com` if no protocol
- BFS over internal links (same hostname only)
- Respect `maxPages` limit
- Strip `#fragments` from URLs before adding to queue
- Skip non-HTML resources (`.pdf`, `.jpg`, `.png`, `.css`, `.js`, etc.)
- Set `User-Agent: NexoraBot/1.0`
- Follow redirects (detect redirect chains — flag if > 2 hops)
- Extract from each page: status code, `<title>`, `<meta name="description">`, `<h1>`, `<link rel="canonical">`, `<meta name="robots">` (noindex check), all `<a href>` internal links, word count of `<body>` text
- Catch fetch errors gracefully — push `{ url, statusCode: 0 }` with empty fields

### 4. AuditScoringService

File: `src/audits/audit-scoring.service.ts`

Implement the expert scoring system from `NEXORA_DOCS.md` section 10 exactly:

5 categories: `technical` (30), `onpage` (25), `performance` (20), `crawlability` (15), `content` (10)

Full issue→impact table must be implemented as a `Record<string, { cat: string; impact: number }>`.

```typescript
computeExpertScore(
  issues: AuditIssue[],
  metrics: { lighthouse?: number }
): { global: number; categories: Record<string, number> }
```

Global score = sum of all category scores (max 100). Clamp each category to 0 minimum.

### 5. DuplicateContentService

File: `src/audits/duplicate-content.service.ts`

Implement shingle-based Jaccard similarity from `NEXORA_DOCS.md` section 11.
- Shingle size: 5 words
- Hash each shingle with MD5 (`crypto.createHash('md5')`)
- Threshold: 0.85 (configurable)
- O(n²) comparison — acceptable for ≤ 500 pages per audit

```typescript
detectDuplicates(
  pages: { url: string; text: string }[],
  threshold?: number
): { urlA: string; urlB: string; similarity: number }[]
```

### 6. DepthService

File: `src/audits/depth.service.ts`

BFS from root URL. Returns `Record<url, depth>`.
Pages at depth ≥ 4 → `deep_page` issue.

```typescript
computeDepth(
  pages: { url: string; outgoing: string[] }[],
  rootUrl: string
): Record<string, number>
```

### 7. InternalLinkingService

File: `src/audits/internal-linking.service.ts`

```typescript
analyze(pages: { url: string; outgoing: string[] }[]): {
  inDegree: Map<string, number>;
  outDegree: Map<string, number>;
  orphanPages: string[];
  weakLinked: { url: string; inLinks: number }[];
}
```

- `orphanPages` = URLs with inDegree === 0 → `orphan_page` issue (severity: high)
- `weakLinked` = URLs with inDegree 1–2 → `weak_internal_links` issue (severity: medium)

### 8. PageSpeed Integration

File: `src/audits/pagespeed.service.ts`

```typescript
async getScore(domain: string): Promise<number>
// Calls https://www.googleapis.com/pagespeedonline/v5/runPagespeed
// ?url=https://domain&strategy=mobile&key=PAGESPEED_API_KEY
// Returns: lighthouseResult.categories.performance.score * 100
// Returns 50 as fallback if API call fails
```

### 9. AuditsProcessor (BullMQ)

File: `src/audits/audits.processor.ts`

Queue: `audits`, Job: `run-audit`
Payload: `{ auditId: string; projectId: string; maxPages: number }`

Full orchestration as documented in `NEXORA_DOCS.md` section 8:
1. `markRunning`
2. `crawlDomain`
3. Per-page checks: `http_error`, `missing_title`, `missing_meta_description`, `missing_h1`, `thin_content` (< 100 words), `noindex`
4. `detectDuplicates`
5. `computeDepth` → `deep_page` issues
6. `analyze` (internal linking) → `orphan_page`, `weak_internal_links` issues
7. `getScore` (PageSpeed)
8. `computeExpertScore`
9. `markDone`

Wrap entire processor in try/catch — call `markFailed` on error.

### 10. AuditsController

File: `src/audits/audits.controller.ts`

All routes protected with `AuthGuard`.

```
POST  /projects/:projectId/audits    → check quota, createAudit, enqueue job, return audit
GET   /projects/:projectId/audits    → listAuditsForProject
GET   /audits/:auditId               → getAudit
GET   /audits/:auditId/issues        → getAuditIssues (query: ?severity=&type=)
```

On `POST /projects/:projectId/audits`:
1. Call `limitsService.ensureCanRunAudit(req.user.id)`
2. Call `limitsService.getMaxPagesPerAudit(req.user.id)`
3. `auditsService.createAudit(projectId, { maxPages })`
4. `auditsQueue.add('run-audit', { auditId, projectId, maxPages }, { attempts: 2 })`
5. Return the created audit object immediately (status: `pending`)

### 11. AuditsModule

Register: `SiteAudit`, `AuditIssue` entities, all services, processor, controller, BullMQ queue `audits`.
Export: `AuditsService`, `AuditScoringService`.

---

## Acceptance Criteria

- [ ] `POST /projects/:id/audits` returns immediately with `status: pending`
- [ ] Audit status transitions: pending → running → done (or failed)
- [ ] All issue types detected and stored correctly
- [ ] Score between 0–100 with category breakdown
- [ ] ForbiddenException thrown when monthly audit limit exceeded

---

## New Dependencies

```bash
pnpm add node-fetch cheerio
pnpm add @types/node-fetch @types/cheerio -D
```
