# Task 11 [API + WEB] — Polish, Onboarding & Deployment

> Read `AGENTS.md` fully before starting.
> All previous tasks must be complete.

## Goal

Make the product shippable: onboarding wizard, landing page, error handling polish, monitoring, and production deployment config for both repos.

---

## Part A — [API] `nexora-api`

### 1. Onboarding Flag

`User` entity already has `onboardingComplete: boolean` (default `false`) from Task 01a.

Add endpoint:
```
PATCH /me/onboarding-complete   → sets onboardingComplete = true for req.user.id
```

### 2. Global Exception Filter

File: `src/common/filters/http-exception.filter.ts`

Create `HttpExceptionFilter` that:
- Formats all errors as `{ error: string; message: string; statusCode: number }`
- Logs 500 errors with full stack trace via NestJS `Logger`
- Sends a clean message for 4xx errors (never expose stack traces)

Apply globally in `main.ts`:
```typescript
app.useGlobalFilters(new HttpExceptionFilter());
```
(`ValidationPipe` should already be global from Task 01a.)

### 3. Sentry Setup

```bash
pnpm add @sentry/nestjs @sentry/profiling-node
```

In `main.ts`, before `NestFactory.create`:
```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

Add `SENTRY_DSN` to `.env.example`.

### 4. Production Dockerfile

**`Dockerfile`** at repo root:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
EXPOSE 3001
CMD ["node", "dist/main"]
```

If Puppeteer is used (Task 09), add to the runner stage:
```dockerfile
RUN apk add --no-cache chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

### 5. README

Write `README.md` at repo root covering:
- Project description (2 sentences)
- Prerequisites (Node 20, pnpm, Docker)
- Setup: clone → `.env` → `docker-compose up -d` (postgres + redis) → `pnpm install` → `pnpm run migration:run` → `pnpm run start:dev`
- Environment variables reference (table)
- How to run tests
- Module overview table (link to `NEXORA_DOCS.md`)
- Note: this is the API repo; the frontend lives in `nexora-web`

---

## Part B — [WEB] `nexora-web`

### 1. Onboarding Wizard

**`app/(app)/onboarding/page.tsx`**

Triggered automatically: in `app/(app)/layout.tsx`, if `/me` returns `onboardingComplete: false` and the user is not already on `/onboarding`, redirect to `/onboarding`.

3-step wizard with step dots (1 / 2 / 3) at top, "Skip" link on each step.

**Step 1 — Create your first project:**
- Fields: project name, domain, country dropdown, language dropdown
- Validate domain format client-side
- On submit: `POST /projects`

**Step 2 — Add keywords to track:**
- Text area: "Enter keywords, one per line" (helper text: "Free plan: up to 5 keywords")
- Country/language pre-filled from step 1, device defaults to desktop
- On submit: `POST /projects/:id/keywords` for each keyword in sequence, show progress (e.g. "Adding 2/5...")

**Step 3 — Launch your first audit:**
- Text: "Ready! Click below to run your first SEO audit on [domain]"
- "Start audit" button → `POST /projects/:id/audits`
- On success: call `PATCH /me/onboarding-complete`, then redirect to `/projects/:id`

"Skip" on any step: call `PATCH /me/onboarding-complete` and redirect to `/dashboard`.

### 2. Landing Page

**`app/(marketing)/page.tsx`**

Marketing layout (`app/(marketing)/layout.tsx`) — no sidebar, top nav: Logo | Features | Pricing | Login | Sign up button.

Sections:
1. **Hero** — headline, subheadline, "Start free" CTA button → `/signup`
2. **Features** — 4 cards (Audit, Rank Tracking, Keyword Research, Competitors)
3. **Pricing** — 3-column table matching `PLAN_LIMITS` (reuse content from billing page)
4. **Social proof** — 3 placeholder testimonials
5. **Footer** — links: Features, Pricing, Login, Sign up

### 3. Global Error Boundary

Create `app/error.tsx` (Next.js error boundary) showing a friendly "Something went wrong" message with a "Try again" button (`reset()`).

For `useQuery` error states across the app, standardize handling:
- 401 → redirect to `/login` (handled centrally in `app/providers.tsx` via React Query's global error handler, or in the `(app)/layout.tsx` auth check)
- 403 → trigger global `UpgradeBanner` (from Task 07)
- 404 → inline "Not found" message
- 500 → inline "Something went wrong, please try again"

### 4. Toast Notifications

Ensure shadcn/ui `Toaster` is mounted once in root layout. Use `useToast` for all success/error feedback across mutations (project created, keyword added, audit launched, etc.) — audit for any missing toasts from earlier tasks.

### 5. Sentry Setup

```bash
npx @sentry/wizard@latest -i nextjs
```
Add `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` to `.env.local.example`.

### 6. Production Dockerfile

**`Dockerfile`** at repo root:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```
Ensure `next.config.js` has `output: 'standalone'`.

### 7. README

Write `README.md` covering:
- Project description (2 sentences)
- Prerequisites (Node 20, pnpm)
- Setup: clone → `.env.local` (point `NEXT_PUBLIC_API_URL` to the running API) → `pnpm install` → `pnpm dev`
- Pages overview table (link to `NEXORA_DOCS.md`)
- Note: this is the frontend repo; the backend lives in `nexora-api` and must be running for this app to work

---

## Acceptance Criteria

- [ ] New users redirected to `/onboarding` on first login
- [ ] Onboarding wizard completes in 3 steps, sets `onboardingComplete`, redirects to project overview
- [ ] "Skip" works at every step
- [ ] Landing page renders correctly with all 5 sections
- [ ] All API errors return `{ error, message, statusCode }` format
- [ ] Sentry captures errors in both apps
- [ ] Both Dockerfiles build successfully
- [ ] Both READMEs cover setup in clear steps
- [ ] `nexora-api` and `nexora-web` run independently and communicate correctly via `NEXT_PUBLIC_API_URL` / CORS
