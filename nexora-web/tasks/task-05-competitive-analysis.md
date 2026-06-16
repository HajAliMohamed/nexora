# Task 05 [API + WEB] — Competitive Analysis

> Read `AGENTS.md` and `NEXORA_DOCS.md` sections 5, 6, 14 before starting.
> API: Tasks 01a, 02a, 03a must be complete. Web: Tasks 01b, 02b, 03b must be complete.

---

## Part A — [API] `nexora-api`

### 1. CompetitorsService

File: `src/competitors/competitors.service.ts`

```typescript
listCompetitors(projectId: string): Promise<Competitor[]>
addCompetitor(projectId: string, domain: string): Promise<Competitor>
removeCompetitor(id: string): Promise<void>

getOverview(projectId: string): Promise<CompetitorOverview>
getKeywordsDiff(projectId: string): Promise<KeywordDiffResult[]>
```

```typescript
// add to src/types/shared.ts
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
```

**`getOverview` implementation:**
- `projectKeywordsTop10`: count of keyword_positions where position <= 10 AND date = most recent date
- `projectEstimatedTraffic`: estimate using CTR model:
  ```
  position 1 → 28% CTR, 2 → 15%, 3 → 11%, 4–5 → 7%, 6–10 → 3%, else → 0.5%
  traffic = sum(volume * CTR) for each keyword
  ```
  Volume not stored yet — use a default of 100 per keyword as placeholder.
- Competitor stats are `0` for now — full competitor SERP data is a future phase.

**`getKeywordsDiff` implementation:**
- Return the project's tracked keywords with latest positions
- Leave `competitorPositions` as empty array — placeholder for future sprint

### 2. CompetitorsController

File: `src/competitors/competitors.controller.ts`

All routes with `AuthGuard`.

```
GET    /projects/:projectId/competitors
POST   /projects/:projectId/competitors          body: { domain: string }
DELETE /projects/:projectId/competitors/:id
GET    /projects/:projectId/competitors/overview
GET    /projects/:projectId/competitors/keywords-diff
```

Validation on `POST`:
- `domain` must be a valid hostname (no protocol, no path) — validate with regex: `/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z]{2,})+$/`
- Check competitor count limit by plan: Free=1, Pro=5, Agency=10 (`maxCompetitorsPerProject`)
- Throw `BadRequestException` if exceeded

Add `ensureCanAddCompetitor(userId, projectId)` to `LimitsService`.

### 3. CompetitorsModule

Register: `Competitor` entity (already exists from Task 01a), controller, service.
Export: `CompetitorsService`.
Import: `ProjectsModule`, `KeywordsModule`.

---

## Part B — [WEB] `nexora-web`

### 1. Update Shared Types

Copy `CompetitorOverview` and `KeywordDiffResult` from `nexora-api/src/types/shared.ts` into `lib/types/shared.ts`.

### 2. Competitors Page

**`app/(app)/projects/[projectId]/competitors/page.tsx`**

**Section 1 — Overview cards:**
```
[ Your domain ]           [ Competitor 1 ]        [ Competitor 2 ]
keywords in top 10: 24    keywords in top 10: 0   ...
est. traffic: 2,400       est. traffic: 0         ...
```
Fetch from `GET /projects/:projectId/competitors/overview`.

**Section 2 — Add/manage competitors:**
- Input for domain + "Add" button → `POST /projects/:projectId/competitors`
- List of current competitors with remove button → `DELETE /projects/:projectId/competitors/:id`
- Show count like "2/5 competitors used" based on plan limit (from `/me/usage`)
- Disable "Add" button with tooltip when limit reached

**Section 3 — Keyword comparison table:**
- Fetch `GET /projects/:projectId/competitors/keywords-diff`
- Table: keyword | your position | (competitor columns — show "–" for now)
- Note at bottom: "Competitor ranking data coming soon"

---

## Acceptance Criteria

- [ ] Can add and remove competitors
- [ ] Competitor limit enforced by plan (API returns 400/403, UI shows disabled state)
- [ ] Overview shows real `projectKeywordsTop10` count and estimated traffic
- [ ] Keywords diff table shows your positions
- [ ] Invalid domain format rejected with clear error message
