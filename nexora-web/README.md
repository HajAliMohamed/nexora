# Nexora Web

Nexora is a multi-tenant SEO SaaS platform (Semrush-like MVP). This is the **frontend** built with Next.js 16 (App Router).

## Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- [nexora-api](https://github.com/your-org/nexora-api) running locally or on a server

## Setup

```bash
git clone <repo>
cd nexora-web
cp .env.local.example .env.local
# Edit .env.local and set NEXT_PUBLIC_API_URL to your running API
pnpm install
pnpm dev
```

App starts on `http://localhost:3000`.

## Pages

| Route | Description |
|---|---|
| `/` | Marketing landing page |
| `/login`, `/signup`, `/reset-password` | Auth pages |
| `/dashboard` | Project list dashboard |
| `/onboarding` | 3-step onboarding wizard |
| `/projects/:id` | Project overview |
| `/projects/:id/audits` | Audit list |
| `/projects/:id/audits/:aid` | Audit detail with issues |
| `/projects/:id/rankings` | Rank tracking with visibility chart |
| `/projects/:id/competitors` | Competitive analysis |
| `/keyword-research` | Keyword search tool |
| `/alerts` | SEO alerts feed |
| `/billing` | Subscription plans and usage |

## Commands

```bash
pnpm dev          # development server
pnpm build        # production build
pnpm typecheck    # TypeScript check
pnpm lint         # ESLint
```

## Notes

- The backend lives in the separate `nexora-api` repository and must be running for this app to function.
- All API calls go through `src/lib/api.ts` with `credentials: 'include'`.
- Auth uses HTTP-only cookies (JWT access + refresh tokens).
