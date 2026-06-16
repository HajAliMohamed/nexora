# Task 01a [API] — Foundations

> Repo: `nexora-api`
> Read `AGENTS.md` and `NEXORA_DOCS.md` sections 2, 4, 16 before starting.

## Goal

Bootstrap the NestJS API with working auth, projects CRUD, and Stripe subscription skeleton.

---

## Scope

### 1. Project Setup

```bash
npx @nestjs/cli new nexora-api
```

- Install: `@nestjs/config @nestjs/jwt @nestjs/typeorm typeorm pg bcrypt class-validator class-transformer @nestjs/schedule @nestjs/bullmq bullmq stripe cors`
- Enable CORS in `main.ts`:
  ```typescript
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  ```
- Install `cookie-parser` + `@types/cookie-parser`
- `docker-compose.yml` at repo root with `postgres` (5432) and `redis` (6379) services
- `.env.example` with all variables from `NEXORA_DOCS.md` section 19

### 2. Shared Types File

Create `src/types/shared.ts` with all types from `NEXORA_DOCS.md` section 18, plus `PlanLimits`:

```typescript
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

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    maxProjects: 1, maxKeywords: 20, maxPagesPerAudit: 100,
    maxAuditsPerMonth: 1, maxCompetitorsPerProject: 1,
    maxKeywordSearchesPerDay: 5, historyDays: 30,
    pdfExport: false, whiteLabel: false,
  },
  pro: {
    maxProjects: 5, maxKeywords: 500, maxPagesPerAudit: 500,
    maxAuditsPerMonth: 10, maxCompetitorsPerProject: 5,
    maxKeywordSearchesPerDay: 50, historyDays: 180,
    pdfExport: true, whiteLabel: false,
  },
  agency: {
    maxProjects: 20, maxKeywords: 5000, maxPagesPerAudit: 2000,
    maxAuditsPerMonth: 9999, maxCompetitorsPerProject: 10,
    maxKeywordSearchesPerDay: 500, historyDays: 730,
    pdfExport: true, whiteLabel: true,
  },
};
```

> Note: copy this exact file to `nexora-web/lib/types/shared.ts` in Task 01b. Keep them in sync.

### 3. Database

- TypeORM config in `src/database/`
- Entities: `User`, `Session`, `Subscription`, `Project`, `Competitor`
- `User` entity includes `onboardingComplete: boolean` (default `false`)
- Generate and run initial migration

### 4. AuthModule

Files:
- `src/auth/auth.module.ts`
- `src/auth/auth.service.ts`
- `src/auth/auth.controller.ts`
- `src/auth/auth.guard.ts`
- `src/auth/dto/signup.dto.ts`, `login.dto.ts`, `reset-password.dto.ts`
- `src/users/users.module.ts`, `users.service.ts`, `user.entity.ts`

Endpoints (see `NEXORA_DOCS.md` section 6):
```
POST /auth/signup
POST /auth/login
POST /auth/refresh
POST /auth/logout
POST /auth/forgot-password
POST /auth/reset-password
GET  /me
GET  /me/usage
```

Auth behavior:
- Passwords hashed with `bcrypt` (10 rounds)
- Access token: JWT, 15min, signed with `JWT_SECRET`, set as HTTP-only cookie `access_token`
- Refresh token: JWT, 7d, stored in `sessions` table, set as HTTP-only cookie `refresh_token`
- Cookie options: `httpOnly: true, secure: NODE_ENV === 'production', sameSite: 'lax'`
- `AuthGuard` reads `access_token` cookie, attaches `req.user = { id, email }`
- `POST /auth/refresh` validates refresh token cookie against DB, issues new access token
- `POST /auth/logout` deletes session from DB, clears both cookies
- On signup: auto-create Free subscription (see BillingModule below)

### 5. ProjectsModule

Files:
- `src/projects/projects.module.ts`
- `src/projects/projects.service.ts`
- `src/projects/projects.controller.ts`
- `src/projects/entities/project.entity.ts`
- `src/projects/entities/competitor.entity.ts`
- `src/projects/dto/create-project.dto.ts`, `update-project.dto.ts`, `add-competitor.dto.ts`

Endpoints:
```
GET    /projects
POST   /projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id
```

`ProjectsService` must also expose:
- `countByUser(userId: string): Promise<number>` — used by LimitsService
- `getAllWithOwners(): Promise<Project[]>` — used by AlertsCron
- `getById(id: string): Promise<Project>` — used by audit/rank processors

### 6. BillingModule (skeleton)

Files:
- `src/billing/billing.module.ts`
- `src/billing/subscriptions.service.ts`
- `src/billing/limits.service.ts`
- `src/billing/billing.controller.ts`
- `src/billing/entities/subscription.entity.ts`

`Subscription` entity:
```typescript
@Column() stripeCustomerId: string;
@Column({ nullable: true }) stripeSubscriptionId: string;
@Column() plan: string;           // free | pro | agency
@Column({ type: 'jsonb' }) limits: PlanLimits;
@Column() status: string;         // active | canceled | trialing
@Column({ nullable: true }) currentPeriodEnd: Date;
```

`LimitsService` skeleton (full implementation in Task 07):
- `ensureCanCreateProject(userId)`
- `ensureCanAddKeyword(userId)`
- `ensureCanRunAudit(userId)`
- `getMaxPagesPerAudit(userId): Promise<number>`
- `getPlanLimits(userId): Promise<PlanLimits>`

On signup, auto-create subscription with `PLAN_LIMITS.free` and `plan: 'free'`, `status: 'active'`.

`GET /me/usage` returns:
```typescript
{
  plan: string;
  limits: PlanLimits;
  usage: { projects: number; keywords: number; auditsThisMonth: number; keywordSearchesToday: number };
}
```
(keywords/audits/searches can return 0 until their modules exist — wire properly in later tasks)

---

## Acceptance Criteria

- [ ] `docker-compose up` starts Postgres and Redis
- [ ] `pnpm run start:dev` runs the API on port 3001
- [ ] Can signup → Free subscription auto-created
- [ ] Can login / logout / refresh
- [ ] `/me` returns current user when authenticated, 401 when not
- [ ] Can create/list/update/delete projects (CRUD)
- [ ] CORS allows requests from `FRONTEND_URL` with credentials
- [ ] TypeScript compiles with zero errors
