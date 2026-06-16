# Task 03a [API] — Rank Tracking

> Repo: `nexora-api`
> Read `AGENTS.md` and `NEXORA_DOCS.md` sections 6, 7, 9 before starting.
> Task 01a must be complete.

## Goal

Track keyword positions daily via a SERP API. Store position history. Provide endpoints for tables, charts, and gained/lost summaries.

---

## Scope

### 1. Entities

**`Keyword` entity** (`src/keywords/entities/keyword.entity.ts`):
```typescript
@Entity('keywords')
export class Keyword {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() projectId: string;
  @ManyToOne(() => Project) project: Project;
  @Column() keyword: string;
  @Column() countryCode: string;
  @Column() languageCode: string;
  @Column({ default: 'desktop' }) device: string; // desktop | mobile
  @CreateDateColumn() createdAt: Date;
}
```

**`KeywordPosition` entity** (`src/keywords/entities/keyword-position.entity.ts`):
```typescript
@Entity('keyword_positions')
export class KeywordPosition {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() keywordId: string;
  @ManyToOne(() => Keyword) keyword: Keyword;
  @Column({ type: 'date' }) date: Date;
  @Column({ nullable: true }) position: number;
  @Column({ nullable: true }) url: string;
  @Column({ type: 'jsonb', default: '{}' }) serpFeatures: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
}
```

Add `Keyword` and `KeywordPosition` types to `src/types/shared.ts` — keep in sync with `nexora-web/lib/types/shared.ts`.

Generate and run migration.

### 2. SerpService

File: `src/serp/serp.service.ts`

The SERP provider is configurable via `SERP_PROVIDER` env var (default: `dataforseo`).

```typescript
async getRanking(params: {
  keyword: string;
  domain: string;
  countryCode: string;
  languageCode: string;
  device: 'desktop' | 'mobile';
}): Promise<{ position: number | null; url?: string }>
```

**DataForSEO implementation:**
- Endpoint: `POST https://api.dataforseo.com/v3/serp/google/organic/live/advanced`
- Auth: Basic auth with `SERP_API_LOGIN:SERP_API_PASSWORD`
- Request body: `[{ keyword, location_code, language_code, device, os: "windows", depth: 50 }]`
- Parse response: find the item whose `url` contains the domain → return its `rank_absolute` as position

**SerpApi implementation:**
- Endpoint: `GET https://serpapi.com/search`
- Params: `engine=google&q={keyword}&gl={countryCode}&hl={languageCode}&num=50&api_key={SERP_API_KEY}`
- Parse `organic_results` array → find item whose `link` contains domain → return `position`

Both: return `{ position: null }` if domain not found in top 50, or if API call fails (log error, don't throw).

Create `SerpModule` exporting `SerpService`.

### 3. RankTrackingService

File: `src/keywords/rank-tracking.service.ts`

```typescript
addKeyword(projectId: string, dto: { keyword, countryCode, languageCode, device }): Promise<Keyword>
listKeywords(projectId: string): Promise<Keyword[]>
deleteKeyword(id: string): Promise<void>
getKeywordById(id: string): Promise<Keyword | null>
addPosition(keywordId: string, dto: { date, position, url?, serpFeatures? }): Promise<KeywordPosition>
getPositions(keywordId: string, from?: string, to?: string): Promise<KeywordPosition[]>
getAllKeywords(): Promise<Keyword[]>                          // used by cron
countKeywordsForUser(userId: string): Promise<number>        // used by LimitsService
getProjectSummary(projectId: string): Promise<{
  totalKeywords: number;
  avgPosition: number | null;
  gained30d: number;
  lost30d: number;
}>
getBigChanges(projectId: string, threshold: number): Promise<{
  gains: { keyword: string; from: number; to: number }[];
  losses: { keyword: string; from: number; to: number }[];
}>
```

**`getProjectSummary` implementation:**
- `totalKeywords`: count keywords for project
- `avgPosition`: average of the most recent position for each keyword (ignore nulls)
- `gained30d`: count keywords whose position improved by ≥ 3 places in the last 30 days
- `lost30d`: count keywords whose position worsened by ≥ 3 places in the last 30 days

**`getBigChanges` implementation:**
- Compare today's position vs 7 days ago for each keyword in project
- `gains`: keywords that moved up by ≥ `threshold` positions
- `losses`: keywords that moved down by ≥ `threshold` positions

### 4. RankTrackingProcessor

File: `src/keywords/rank-tracking.processor.ts`

Queue: `rank-tracking`, Job: `refresh-keyword`
Payload: `{ keywordId: string }`

```typescript
@Process('refresh-keyword')
async handleRefreshKeyword(job: Job<{ keywordId: string }>) {
  const keyword = await this.rankService.getKeywordById(job.data.keywordId);
  if (!keyword) return;
  const project = await this.projectsService.getById(keyword.projectId);
  const result = await this.serpService.getRanking({
    keyword: keyword.keyword,
    domain: project.domain,
    countryCode: keyword.countryCode,
    languageCode: keyword.languageCode,
    device: keyword.device as 'desktop' | 'mobile',
  });
  await this.rankService.addPosition(keyword.id, {
    date: new Date(),
    position: result.position,
    url: result.url,
  });
}
```

### 5. RankTrackingCron

File: `src/keywords/rank-tracking.cron.ts`

```typescript
@Cron('0 3 * * *')   // every day at 03:00
async enqueueDailyRefresh() {
  const keywords = await this.rankService.getAllKeywords();
  for (const kw of keywords) {
    await this.rankQueue.add('refresh-keyword', { keywordId: kw.id }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }
}
```

### 6. RankTrackingController

File: `src/keywords/rank-tracking.controller.ts`

All routes with `AuthGuard`.

```
POST   /projects/:projectId/keywords         → ensureCanAddKeyword, addKeyword
GET    /projects/:projectId/keywords         → listKeywords
DELETE /keywords/:id                         → deleteKeyword
GET    /keywords/:id/positions               → getPositions(?from=YYYY-MM-DD&to=YYYY-MM-DD)
GET    /projects/:projectId/keywords/summary → getProjectSummary
```

### 7. KeywordsModule

Register: `Keyword`, `KeywordPosition` entities, all services, processor, cron, controller.
Export: `RankTrackingService`.
Import: `ProjectsModule`, `BillingModule`, `SerpModule`, `BullModule.registerQueue({ name: 'rank-tracking' })`.

---

## Acceptance Criteria

- [ ] Can add a keyword to a project
- [ ] Daily cron enqueues refresh jobs for all keywords
- [ ] Processor fetches position from SERP API and stores it
- [ ] `getProjectSummary` returns correct totals
- [ ] `getBigChanges` returns correct gains/losses
- [ ] Keyword limit enforced (ForbiddenException when over plan limit)

---

## New Dependencies

```bash
pnpm add node-fetch   # if not already installed
```
