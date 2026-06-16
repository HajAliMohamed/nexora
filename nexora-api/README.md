# Nexora API

Nexora is a multi-tenant SEO SaaS platform (Semrush-like MVP). This is the **backend API** built with NestJS.

## Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Docker (for local Postgres 5433 + Redis 6380)

## Setup

```bash
git clone <repo>
cd nexora-api
cp .env.example .env
docker-compose up -d
pnpm install
pnpm run start:dev
```

Server starts on `http://localhost:3001`.

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret for JWT signing |
| `FRONTEND_URL` | CORS origin (e.g. `http://localhost:3000`) |
| `SERP_PROVIDER` | `mock` or `dataforSEO` |
| `KEYWORDS_PROVIDER` | `mock` or `dataforSEO` |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `SENTRY_DSN` | Sentry DSN (optional) |

## Modules

| Module | Description |
|---|---|
| Auth | JWT + refresh token auth, signup/login/logout/refresh/reset-password |
| Users | User CRUD, onboarding flag |
| Projects | Project CRUD, domain, country, language |
| Audits | SEO site audits with BullMQ crawler, 5-category scoring |
| Keywords | Rank tracking with SERP provider, daily cron |
| Keyword Research | Keyword search with daily quota enforcement |
| Competitors | Competitor domain management, traffic estimation |
| Alerts | SEO alert creation with 24h dedup, daily cron |
| Billing | Stripe subscription management, usage limits |
| Reports | Puppeteer PDF generation for audits and rankings |

## Commands

```bash
pnpm run start:dev    # watch mode
pnpm run build        # production build
pnpm run typecheck    # TypeScript check
pnpm run lint         # ESLint
pnpm run test         # Jest tests
```

## Notes

- PostgreSQL runs on port **5433** (not the default 5432) to avoid conflicts with native Windows PostgreSQL.
- Redis runs on port **6380**.
- The frontend lives in the separate `nexora-web` repository.
