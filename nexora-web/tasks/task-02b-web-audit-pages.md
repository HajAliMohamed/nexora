# Task 02b [WEB] — Audit Pages

> Repo: `nexora-web`
> Read `AGENTS.md` and `NEXORA_DOCS.md` sections 6, 10, 17 before starting.
> Task 02a (API) must be complete.

## Goal

Build the audit list and audit detail pages, including live status polling and an issues table with filters.

---

## Scope

### 1. Update Shared Types

Copy `SiteAudit` and `AuditIssue` types from `nexora-api/src/types/shared.ts` into `lib/types/shared.ts`.

### 2. Audit List Page

**`app/(app)/projects/[projectId]/audits/page.tsx`**

Shows:
- "Launch audit" button — calls `POST /projects/:projectId/audits` via `useMutation`
  - Disabled with tooltip if `GET /me/usage` shows audits-this-month limit reached
- Table of past audits: date | status | global score | pages crawled | actions
  - Status badge colors: pending=gray, running=blue (with spinner icon), done=green, failed=red
- Clicking a row navigates to `/projects/[projectId]/audits/[auditId]`
- **Polling:** use `useQuery` with `refetchInterval: (data) => data?.some(a => ['pending','running'].includes(a.status)) ? 5000 : false`

### 3. Audit Detail Page

**`app/(app)/projects/[projectId]/audits/[auditId]/page.tsx`**

Fetches `GET /audits/:auditId` and `GET /audits/:auditId/issues`.

**Layout:**

Top section — score overview:
```
┌─────────────────────────────────────────────────┐
│   [ 73 ]/100        Technical    28/30           │
│                     On-page      20/25           │
│   Global Score      Performance  14/20           │
│                     Crawlability 12/15           │
│                     Content       7/10           │
│                                                  │
│   142 pages crawled · 18 issues                  │
└─────────────────────────────────────────────────┘
```

If `status` is `pending` or `running`: show spinner + "Audit in progress..." and poll every 5s (`refetchInterval`).
If `status` is `failed`: show error state with "Retry audit" button.

Bottom section — issues table:
- Columns: Severity (badge) | URL | Type | Message
- Severity badge colors: critical=red, high=orange, medium=yellow, low=gray
- Filter controls above the table:
  - Severity dropdown: All / Critical / High / Medium / Low
  - Type dropdown: populated dynamically from unique `type` values in the issues data
- Default sort: severity (critical first), then by URL
- Pagination: 25 rows per page if more than 25 issues

### 4. Trigger Audit from Project Overview (stub)

On `app/(app)/projects/[projectId]/page.tsx` (the placeholder from Task 01b), add a basic "Run audit" button that calls the same mutation and links to the audits list. (Full overview dashboard comes in Task 08 — this is just a stopgap.)

---

## Acceptance Criteria

- [ ] "Launch audit" triggers a new audit and appears in the list with `pending` status
- [ ] List auto-refreshes while any audit is pending/running, stops when all are done/failed
- [ ] Audit detail page shows score breakdown correctly
- [ ] Detail page polls while audit is running, stops on completion
- [ ] Issues table filters by severity and type correctly
- [ ] Severity badges color-coded correctly
- [ ] Pagination works for > 25 issues
