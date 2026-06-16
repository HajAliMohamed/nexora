# Task 08 [API + WEB] — Project Overview Dashboard

> Read `AGENTS.md` and `NEXORA_DOCS.md` sections 17, 18 before starting.
> API: Tasks 01a–07 must be complete. Web: Tasks 01b–07 must be complete.

---

## Part A — [API] `nexora-api`

### 1. Overview Endpoint

File: `src/projects/projects-overview.service.ts`

```typescript
async getOverview(projectId: string): Promise<ProjectOverview>
```

```typescript
// add to src/types/shared.ts
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
```

Use `Promise.all` to fetch all three sections in parallel. Never let a failure in one section break the whole response — wrap each in try/catch and return `null`/empty defaults for that section if it fails.

Add to `ProjectsController`:
```
GET /projects/:projectId/overview → getOverview
```

Inject `AuditsService`, `RankTrackingService`, `CompetitorsService` into `ProjectsModule` (add as imports — watch for circular dependency; use `forwardRef()` if needed).

---

## Part B — [WEB] `nexora-web`

### 1. Update Shared Types

Copy `ProjectOverview` from `nexora-api/src/types/shared.ts` into `lib/types/shared.ts`.

### 2. Global Dashboard

**`app/(app)/dashboard/page.tsx`** — rebuild from Task 01b stub

Shows all user projects as cards. Each card:
- Project name + domain
- SEO score badge (from last audit) — or "No audit yet" if null
- Average keyword position — or "–"
- Last audit date — or "Never"
- "View project" link → `/projects/[id]`
- "New audit" quick button → `POST /projects/:id/audits`

Empty state: "Add your first project to get started" with a "Create project" button.

### 3. Project Overview Page

**`app/(app)/projects/[projectId]/page.tsx`** — rebuild from stub

Calls `GET /projects/:id/overview`. Three stacked sections:

**Section 1 — SEO Score:**
```
┌─────────────────────────────────────────────────────┐
│  SEO Score                          [ Launch audit ] │
│                                                      │
│  [ 73 ]    Technical  Onpage  Performance  ...       │
│  /100      [ 28/30 ]  [20/25]  [ 14/20 ]   ...      │
│                                                      │
│  Last audit: 2 days ago · 142 pages · 18 issues      │
│  [ View full report → ]                              │
└─────────────────────────────────────────────────────┘
```
- If `lastAudit === null`: show "No audit yet" + "Launch first audit" button
- If `status` is `pending`/`running`: spinner + "Audit in progress..." + poll every 10s
- "View full report" links to `/projects/[id]/audits/[auditId]`

**Section 2 — Rankings:**
```
┌──────────────────────────────────────────────────────┐
│  Rankings                           [ + Add keyword ] │
│                                                       │
│  [ 34 ]        [ 12.4 ]      [ +5 ]      [ -2 ]      │
│  keywords      avg position  gained      lost         │
│                              (30 days)   (30 days)    │
│                                                       │
│  [ View all rankings → ]                              │
└──────────────────────────────────────────────────────┘
```
Numbers colored: gained = green, lost = red, avg position = neutral.
"+ Add keyword" links to `/projects/[id]/rankings`.

**Section 3 — Competitors:**
```
┌──────────────────────────────────────────────────────┐
│  Competitors                        [ + Add ]         │
│                                                       │
│  Your domain: 24 keywords in top 10                  │
│                                                       │
│  ─────────────────────────────────────────────       │
│  No competitors added yet.                            │
│  (or table of competitors when added)                 │
└──────────────────────────────────────────────────────┘
```

### 4. Tab Navigation

**`app/(app)/projects/[projectId]/layout.tsx`**

Tab bar: `[ Overview ] [ Audits ] [ Rankings ] [ Competitors ] [ Settings ]`
Active tab highlighted based on current path.

---

## Acceptance Criteria

- [ ] Overview endpoint returns data in < 500ms (parallel fetching)
- [ ] One failing section (e.g. no competitors module data) doesn't break the whole response
- [ ] Dashboard lists all projects with correct summary data
- [ ] Project overview shows score, category breakdown, rankings summary, competitors
- [ ] "No audit yet" and "Audit in progress" states handled correctly with polling
- [ ] Tab navigation highlights the active tab correctly
