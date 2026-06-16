# Task 01b [WEB] — Foundations

> Repo: `nexora-web`
> Read `AGENTS.md` and `NEXORA_DOCS.md` sections 17, 18 before starting.
> Task 01a (API) should be complete and running on `http://localhost:3001`.

## Goal

Bootstrap the Next.js app with auth pages, API client, layout, and project CRUD UI.

---

## Scope

### 1. Project Setup

```bash
npx create-next-app@latest nexora-web --typescript --tailwind --app
```

- Install: `@tanstack/react-query recharts`
- Setup shadcn/ui: `npx shadcn@latest init`
- `.env.local.example`:
  ```
  NEXT_PUBLIC_API_URL=http://localhost:3001
  ```

### 2. Shared Types File

Create `lib/types/shared.ts` — copy **exactly** from `nexora-api/src/types/shared.ts` (Task 01a). Includes all entity types, `PlanLimits`, `PLAN_LIMITS`.

### 3. API Client

Create `lib/api.ts`:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

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
```

### 4. React Query Provider

Create `app/providers.tsx` (client component) wrapping `QueryClientProvider`. Use in root `app/layout.tsx`.

### 5. Auth Pages

Pages:
- `app/(auth)/login/page.tsx`
- `app/(auth)/signup/page.tsx`
- `app/(auth)/reset-password/page.tsx`
- `app/(auth)/layout.tsx` — redirects to `/dashboard` if already authenticated (check via `/me`)

Behavior:
- Controlled inputs + `onClick` handlers (no `<form>` tags)
- `useMutation` calling `apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({...}) })`
- On success: redirect to `/dashboard`
- Show inline error messages from `ApiError`

### 6. App Layout & Auth Guard

- `app/(app)/layout.tsx`:
  - Fetches `/me` via `useQuery`
  - Redirects to `/login` if 401
  - Sidebar navigation: Dashboard | Projects | Keyword Research | Alerts | Billing
  - Top bar: user email + logout button

### 7. Projects Dashboard

Pages:
- `app/(app)/dashboard/page.tsx` — list of all user projects
- `app/(app)/projects/new/page.tsx` — create project form (name, domain, country dropdown, language dropdown)
- `app/(app)/projects/[projectId]/page.tsx` — placeholder showing project name + domain (full dashboard in Task 08)

Dashboard shows:
- List of projects as cards (name, domain, country)
- "New project" button
- Empty state if no projects: "Add your first project to get started"

### 8. Project Settings Page

**`app/(app)/projects/[projectId]/settings/page.tsx`**

Simple form: update name, country code, language code (PATCH).
"Delete project" button with confirmation dialog (DELETE).

---

## Acceptance Criteria

- [ ] `pnpm dev` runs the app on port 3000
- [ ] Signup → redirected to dashboard
- [ ] Login/logout work, cookies persist across reload
- [ ] Unauthenticated users redirected to `/login` from `/dashboard`
- [ ] Can create a project, see it in the list
- [ ] Can update and delete a project from settings
- [ ] TypeScript compiles with zero errors
