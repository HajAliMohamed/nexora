# Task 07 [API + WEB] — Billing & Quotas

> Read `AGENTS.md` and `NEXORA_DOCS.md` section 16 before starting.
> API: Task 01a must be complete (BillingModule skeleton exists). Web: Task 01b must be complete.

---

## Part A — [API] `nexora-api`

### 1. Complete SubscriptionsService

File: `src/billing/subscriptions.service.ts`

```typescript
getActiveSubscription(userId: string): Promise<Subscription>
// Throws NotFoundException if none found (shouldn't happen — Free sub created on signup)

upsertFromStripe(stripeData: {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  plan: string;
  status: string;
  limits: PlanLimits;
  currentPeriodEnd: Date;
  userId: string;
}): Promise<void>
// INSERT or UPDATE subscription for user
```

`PlanLimits` and `PLAN_LIMITS` already exist in `src/types/shared.ts` from Task 01a.

### 2. Complete LimitsService

File: `src/billing/limits.service.ts`

All enforcement methods must:
1. Fetch active subscription for user
2. Compare current usage against plan limit (`PLAN_LIMITS[subscription.plan]` or `subscription.limits`)
3. Throw `ForbiddenException` with a clear message if over limit

```typescript
ensureCanCreateProject(userId: string): Promise<void>
ensureCanAddKeyword(userId: string): Promise<void>
ensureCanRunAudit(userId: string): Promise<void>
ensureCanAddCompetitor(userId: string, projectId: string): Promise<void>
getMaxPagesPerAudit(userId: string): Promise<number>
getMaxKeywordSearchesPerDay(userId: string): Promise<number>
canExportPdf(userId: string): Promise<boolean>
getPlanLimits(userId: string): Promise<PlanLimits>
```

For `ensureCanRunAudit`: count audits where `createdAt >= start of current month AND project.userId = userId`.

### 3. Stripe Webhook Handler

File: `src/billing/billing.controller.ts`

`POST /billing/webhook` — **must be unauthenticated** (no AuthGuard). Verify Stripe signature with `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`.

> Note: NestJS needs raw body for Stripe signature verification. Configure this route to receive raw body — use `express.raw({ type: 'application/json' })` middleware on this specific route, or use `rawBody: true` in `NestFactory.create` options and access `req.rawBody`.

Handle these events:
- `checkout.session.completed` → get subscription from Stripe, upsert subscription in DB
- `customer.subscription.updated` → upsert updated subscription
- `customer.subscription.deleted` → set status to `canceled`, reset limits to `PLAN_LIMITS.free`

Helper to map Stripe price ID → plan name:
```typescript
function getPlanFromPriceId(priceId: string): string {
  const map: Record<string, string> = {
    [process.env.STRIPE_PRO_PRICE_ID!]: 'pro',
    [process.env.STRIPE_AGENCY_PRICE_ID!]: 'agency',
  };
  return map[priceId] ?? 'free';
}
```

`POST /billing/create-checkout-session` (authenticated):
- Body: `{ plan: 'pro' | 'agency' }`
- Creates or retrieves Stripe customer for user
- Creates Stripe checkout session with the right price ID, `success_url` pointing to `${FRONTEND_URL}/billing/success`, `cancel_url` to `${FRONTEND_URL}/billing`
- Returns `{ url: string }`

`POST /billing/create-portal-session` (authenticated):
- Creates Stripe billing portal session for the user's customer ID, `return_url: ${FRONTEND_URL}/billing`
- Returns `{ url: string }`

### 4. Complete `GET /me/usage`

Returns:
```typescript
{
  plan: string;
  limits: PlanLimits;
  usage: {
    projects: number;
    keywords: number;
    auditsThisMonth: number;
    keywordSearchesToday: number;
  };
}
```

Wire up real values now that `ProjectsService.countByUser`, `RankTrackingService.countKeywordsForUser`, `AuditsService.countAuditsThisMonth`, and the Redis `kw-limit:` counter all exist.

---

## New Environment Variables (API)

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_AGENCY_PRICE_ID=price_...
FRONTEND_URL=http://localhost:3000
```

---

## Part B — [WEB] `nexora-web`

### 1. Billing Page

**`app/(app)/billing/page.tsx`**

Shows:
- Current plan name + badge (Free/Pro/Agency) — from `GET /me/usage`
- Usage bars for each quota: projects, keywords, audits this month, keyword searches today
  - `current / max` with colored bar: < 70% green, 70–90% yellow, > 90% red
- Pricing table with 3 columns (Free / Pro / Agency) — list features per `PLAN_LIMITS`
- "Upgrade to Pro" / "Upgrade to Agency" buttons → `POST /billing/create-checkout-session` → `window.location.href = data.url`
- "Manage billing" button → `POST /billing/create-portal-session` → redirect
- Current plan's button shows "Current plan" (disabled)

### 2. Billing Success Page

**`app/(app)/billing/success/page.tsx`**
- Text: "Your plan has been upgraded! Enjoy your new limits."
- Auto-redirect to `/dashboard` after 3 seconds (`useEffect` + `setTimeout`)

### 3. Global Upgrade Banner

Create a shared `UpgradeBanner` component. When any `useMutation` or `useQuery` catches a `403` `ApiError`, show a dismissible banner:
`"You've reached your {resource} limit. Upgrade your plan to continue."`
with an "Upgrade" button linking to `/billing`.

Wire this into a global error handler (React Query's `QueryCache`/`MutationCache` `onError` in `app/providers.tsx`, using a simple global state/context for the banner).

---

## Acceptance Criteria

- [ ] Stripe webhook correctly upgrades/downgrades subscription in DB
- [ ] `ensureCanRunAudit` throws 403 when monthly limit hit
- [ ] All other quota methods enforced correctly
- [ ] `/me/usage` returns accurate real numbers
- [ ] Pricing page shows correct feature list per plan
- [ ] Upgrade flow works end-to-end (Stripe checkout → webhook → DB update → success page)
- [ ] Usage bars show accurate numbers and color thresholds
- [ ] 403 responses show global upgrade banner

---

## New Dependencies

```bash
# nexora-api
pnpm add stripe
```
