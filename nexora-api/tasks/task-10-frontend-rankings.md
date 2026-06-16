# Task 10 [API + WEB] — Rankings Charts & Visibility (Polish)

> Read `AGENTS.md` and `NEXORA_DOCS.md` section 17 before starting.
> API: Task 03a must be complete. Web: Task 03b must be complete.

## Goal

Polish the rankings page with a visibility trend chart, gains/losses sections, and improved table UX.

---

## Part A — [API] `nexora-api`

### 1. Visibility Endpoint

Add to `RankTrackingController` / `RankTrackingService`:

**`GET /projects/:projectId/keywords/visibility`**

```typescript
// add to src/types/shared.ts
export type VisibilityPoint = { date: string; score: number };
```

Visibility score calculation per day:
```
For each keyword on a given date:
  position 1     → 100 pts
  position 2–3   → 60 pts
  position 4–5   → 30 pts
  position 6–10  → 10 pts
  position 11–20 → 3 pts
  position > 20  → 0 pts

visibility_day = (sum of pts for all keywords) / (total keywords * 100) * 100
```

Return last 90 days. Skip days with no data (don't interpolate).

### 2. Gains/Losses Endpoint

**`GET /projects/:projectId/keywords/summary/gains-losses`**

```typescript
// add to src/types/shared.ts
export type GainsLosses = {
  gains: { keyword: string; from: number; to: number; change: number }[];
  losses: { keyword: string; from: number; to: number; change: number }[];
};
```

Returns the top 10 biggest gains and top 10 biggest drops in the last 30 days, sorted by absolute change descending.

---

## Part B — [WEB] `nexora-web`

### 1. Update Shared Types

Copy `VisibilityPoint` and `GainsLosses` from `nexora-api/src/types/shared.ts` into `lib/types/shared.ts`.

### 2. Rankings Page — Full Rebuild

**`app/(app)/projects/[projectId]/rankings/page.tsx`**

**Top area — KPI row:**
```
[ 34 keywords ] [ avg pos: 12.4 ] [ +5 gained ] [ -2 lost ] [ visibility: 31% ]
```
Data from `GET /projects/:projectId/keywords/summary` (existing) + visibility from the new endpoint.

**Visibility trend chart** (Recharts `AreaChart`):
- Fetch `GET /projects/:projectId/keywords/visibility`
- X axis: dates (last 90 days)
- Y axis: 0–100%
- Filled area chart, blue gradient fill

**Gains & Losses section** (two columns):
```
Top Gains (30d)               Top Losses (30d)
keyword A: 18 → 4 (+14) ↑    keyword D: 3 → 11 (-8) ↓
keyword B: 25 → 8 (+17) ↑    keyword E: 7 → 19 (-12) ↓
...                           ...
```
Fetch from `GET /projects/:projectId/keywords/summary/gains-losses`.
Empty state for each column: "No significant changes in the last 30 days."

**Keywords table** (full list, below charts):

Columns: keyword | country | device | current pos | 7d Δ | last checked | actions

- Sortable columns: keyword (alpha), position (asc/desc), 7d change
- Filterable: by device (all/desktop/mobile), by country
- Row click → expand inline to show mini position history chart (Recharts `LineChart`, last 30 days, 300x120px, inverted Y axis, "Not ranked" for null positions)
- Actions: "Delete" with confirmation

**Add keyword** — move to a slide-in side panel (shadcn/ui `Sheet`) triggered by "+ Add keyword" button, instead of inline form.

---

## Acceptance Criteria

- [ ] Visibility trend chart renders correctly for projects with position history
- [ ] Visibility chart shows empty state for projects with no history
- [ ] Gains and losses sections show correct top-10 data
- [ ] Keywords table sorts and filters correctly
- [ ] Inline position history chart expands on row click with inverted Y axis
- [ ] Add keyword slide-in panel works correctly
- [ ] Delete keyword with confirmation works
