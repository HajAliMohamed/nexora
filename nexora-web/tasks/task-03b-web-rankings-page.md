# Task 03b [WEB] — Rankings Page (Basic)

> Repo: `nexora-web`
> Read `AGENTS.md` and `NEXORA_DOCS.md` sections 9, 17 before starting.
> Task 03a (API) must be complete.

## Goal

Build a working rankings page: add keywords, view a table of current positions, and a basic position history chart.

> Note: this is the basic version. Visibility trends, gains/losses sections, and the polished UI come in Task 10.

---

## Scope

### 1. Update Shared Types

Copy `Keyword` and `KeywordPosition` types from `nexora-api/src/types/shared.ts` into `lib/types/shared.ts`.

### 2. Rankings Page

**`app/(app)/projects/[projectId]/rankings/page.tsx`**

**Section 1 — Add keyword form:**
- Input: keyword text
- Dropdowns: country (fr, en, es, de, it), language (fr, en, es, de, it), device (desktop/mobile toggle)
- "Add keyword" button → `POST /projects/:projectId/keywords` via `useMutation`
  - On success, invalidate the keywords query
  - Disabled with tooltip if keyword limit reached (check `/me/usage`)

**Section 2 — Keywords table:**

Fetch `GET /projects/:projectId/keywords` and, for each keyword, the latest two positions via `GET /keywords/:id/positions` (or fetch all positions and compute client-side).

Columns: keyword | country | device | current position | 7d change | last updated | actions

- "Current position" = most recent position from DB (or `–` if never fetched)
- "7d change" = diff between today and 7 days ago:
  - shown as `+3` in green if improved (lower number = better)
  - shown as `-5` in red if worsened
  - `–` if insufficient data
- Actions column: delete button (with confirmation) → `DELETE /keywords/:id`
- Clicking a row expands to show the position history chart for that keyword

### 3. Position History Chart

Use Recharts `LineChart`:
- Fetch `GET /keywords/:id/positions?from={30daysAgo}&to={today}`
- X axis: dates
- Y axis: position, **inverted** (position 1 at top, higher numbers lower) — use `reversed` domain or custom tick formatting
- Null positions shown as gaps in the line
- Tooltip shows exact position and date

---

## Acceptance Criteria

- [ ] Can add a keyword with country/language/device
- [ ] Table shows current position and 7d change with correct coloring
- [ ] Position history chart renders with inverted Y axis
- [ ] Can delete a keyword with confirmation
- [ ] Keyword limit enforced — disabled state shown when reached
