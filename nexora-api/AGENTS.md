# AGENTS.md — Nexora

This file tells AI coding agents (opencode, etc.) everything needed to work on this project effectively.
Read this file fully before touching any code.

---

## What This Project Is

Nexora is a multi-tenant SEO SaaS platform (Semrush-like MVP).
Full technical spec is in `NEXORA_DOCS.md`.
Always read the relevant section of `NEXORA_DOCS.md` before implementing a feature.

---

## Repo Structure (Two Separate Repos)

This project is **NOT a monorepo**. There are two independent repositories:

```
nexora-api/                  ← NestJS backend (separate repo, separate deploy)
  src/
    auth/
    users/
    projects/
    audits/
    keywords/
    serp/
    keyword-research/
    competitors/
    billing/
    alerts/
    reports/
    common/
    types/                  ← shared types live here too (see below)
  NEXORA_DOCS.md
  AGENTS.md                 ← this file (copy in both repos)
  tasks/
  .env.example
  docker-compose.yml        ← postgres + redis for local dev

nexora-web/                  ← Next.js frontend (separate repo, separate deploy)
  app/
    (marketing)/
    (auth)/
    (app)/
  components/
  lib/
    types/                  ← shared types live here too (see below)
    api.ts                  ← API client
  AGENTS.md                 ← this file (copy in both repos)
  tasks/
  .env.local.example
```

### Shared Types Strategy

Since there's no monorepo/workspace, **shared TypeScript types are duplicated** in both repos at:
- `nexora-api/src/types/shared.ts`
- `nexora-web/lib/types/shared.ts`

These two files must stay **identical**. When a type changes, update both files in the same task and note it in the task's PR/commit description.

(Alternative for later: publish `@nexora/types` as a private npm package once the API stabilizes — not needed for MVP.)

---

## How to Work on This Project

Each task file specifies which repo it applies to: `[API]`, `[WEB]`, or `[API + WEB]`.

### Start every session by:
1. Reading this file (`AGENTS.md`)
2. Confirming which repo you're working in (check `package.json` name field)
3. Reading the relevant `tasks/task-XX-*.md` file
4. Reading the matching section(s) of `NEXORA_DOCS.md`

### Never:
- Skip reading the task file before writing code
- Generate placeholder implementations (no `// TODO: implement` stubs — write real code)
- Invent new patterns that differ from `NEXORA_DOCS.md` without a comment explaining why
- Add dependencies not listed without asking first
- Mix frontend and backend code in the same repo

### Always:
- Keep TypeScript strict (`strict: true`)
- Keep `src/types/shared.ts` (API) and `lib/types/shared.ts` (Web) in sync when types change
- Follow the NestJS module pattern: `*.module.ts`, `*.service.ts`, `*.controller.ts`, `*.entity.ts`
- Write DTOs with `class-validator` decorators for every controller input
- Use `@UseGuards(AuthGuard)` on all protected controllers

---

## Cross-Repo Communication

- The frontend talks to the API over HTTP only — `NEXT_PUBLIC_API_URL` env var points to the API base URL
- Auth uses HTTP-only cookies — the API must set `Access-Control-Allow-Credentials: true` and the frontend must use `credentials: 'include'` on all fetches
- CORS: API allows origin = `FRONTEND_URL` env var (configured in `nexora-api/.env`)

---

## Commands

### nexora-api
```bash
docker-compose up -d          # starts Postgres + Redis
pnpm install
pnpm run start:dev            # watch mode, default port 3001
pnpm run migration:run
pnpm run migration:generate -- src/migrations/MigrationName
pnpm run typecheck
pnpm run lint
```

### nexora-web
```bash
pnpm install
pnpm dev                       # default port 3000
pnpm typecheck
pnpm lint
pnpm build
```

---

## Tech Conventions

### Backend (nexora-api — NestJS)

- ORM: TypeORM with `@Entity()` decorators, migrations in `src/migrations/`
- All entities use `UUID` primary keys via `@PrimaryGeneratedColumn('uuid')`
- All entities have `@CreateDateColumn() createdAt`
- Auth: JWT access token (15min) + refresh token (7d) stored in HTTP-only cookies
- Guards: `AuthGuard` in `src/common/guards/auth.guard.ts` — inject `@Req() req` to get `req.user`
- Queues: BullMQ via `@nestjs/bullmq`. Queue names: `audits`, `rank-tracking`, `alerts`
- Crons: `@nestjs/schedule` with `@Cron()` decorator
- Config: `@nestjs/config` — all env vars accessed via `ConfigService`
- Errors: throw `BadRequestException`, `ForbiddenException`, `NotFoundException` from `@nestjs/common`
- DTOs: `class-validator` + `class-transformer`, `ValidationPipe` globally applied
- CORS enabled for `FRONTEND_URL` with `credentials: true`

### Frontend (nexora-web — Next.js)

- App Router only — no Pages Router
- All API calls go through `lib/api.ts` — a thin fetch wrapper that prefixes `NEXT_PUBLIC_API_URL` and sets `credentials: 'include'`
- Data fetching: TanStack Query (`useQuery`, `useMutation`)
- Styling: Tailwind CSS utility classes only — no inline styles
- Components: shadcn/ui for UI primitives
- Charts: Recharts
- No `<form>` elements — use `onClick` handlers with `useMutation`

### Database

- PostgreSQL via TypeORM (lives in `nexora-api` only)
- JSONB columns for: `subscriptions.limits`, `audit_issues.extra`, `keyword_positions.serp_features`, `seo_alerts.payload`, `site_audits.category_scores`
- All foreign keys have `ON DELETE CASCADE` unless specified otherwise

---

## API Client Pattern (nexora-web)

`lib/api.ts`:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message || res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
```

---

## Module Dependency Map (nexora-api)

```
AuthModule
  └── used by everything (AuthGuard)

BillingModule (SubscriptionsModule + LimitsService)
  └── used by: ProjectsModule, AuditsModule, KeywordsModule

ProjectsModule
  └── used by: AuditsModule, KeywordsModule, CompetitorsModule, AlertsModule

AuditsModule
  ├── depends on: ProjectsModule, BillingModule
  └── internal: CrawlerService, ScoringService, DuplicateContentService,
                DepthService, InternalLinkingService

KeywordsModule (rank tracking)
  ├── depends on: ProjectsModule, BillingModule
  └── internal: SerpService, RankTrackingCron, RankTrackingProcessor

KeywordResearchModule
  └── depends on: BillingModule (quota check), KeywordsModule (add-to-project)

CompetitorsModule
  └── depends on: ProjectsModule, KeywordsModule

AlertsModule
  └── depends on: KeywordsModule, ProjectsModule

ReportsModule
  └── depends on: AuditsModule, KeywordsModule
```

---

## Environment Variables

### nexora-api/.env
See `.env.example`. Critical ones:
- `DATABASE_URL`, `REDIS_URL`
- `JWT_SECRET`
- `FRONTEND_URL` (for CORS)
- `SERP_API_KEY` / `SERP_API_LOGIN` / `SERP_API_PASSWORD`
- `KEYWORDS_API_LOGIN` / `KEYWORDS_API_PASSWORD`
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`
- `PAGESPEED_API_KEY`

### nexora-web/.env.local
- `NEXT_PUBLIC_API_URL` — e.g. `http://localhost:3001` in dev

---

## Current Status

Track completed tasks here. Update after each session.

- [ ] Task 01 [API] — Foundations: auth, projects, billing skeleton, DB
- [ ] Task 01b [WEB] — Foundations: auth pages, layout, project CRUD UI
- [ ] Task 02 [API] — Audit Module: crawler, scoring, BullMQ job
- [ ] Task 02b [WEB] — Audit pages: list + detail with issues table
- [ ] Task 03 [API] — Rank Tracking: SERP integration, positions, cron
- [ ] Task 03b [WEB] — Rankings page: table + charts
- [ ] Task 04 [API + WEB] — Keyword Research
- [ ] Task 05 [API + WEB] — Competitive Analysis
- [ ] Task 06 [API + WEB] — SEO Alerts
- [ ] Task 07 [API + WEB] — Billing & Quotas (Stripe)
- [ ] Task 08 [API + WEB] — Project Overview Dashboard
- [ ] Task 09 [API + WEB] — PDF Reports
- [ ] Task 10 [WEB] — Rankings charts & visibility polish
- [ ] Task 11 [API + WEB] — Onboarding, landing page, deploy
