# Task 06 [API + WEB] — SEO Alerts

> Read `AGENTS.md` and `NEXORA_DOCS.md` section 15 before starting.
> API: Tasks 01a and 03a must be complete. Web: Tasks 01b and 03b must be complete.

---

## Part A — [API] `nexora-api`

### 1. SeoAlert Entity

File: `src/alerts/entities/seo-alert.entity.ts`

```typescript
@Entity('seo_alerts')
export class SeoAlert {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() userId: string;
  @Column() projectId: string;
  @Column() type: string;             // ranking_gain | ranking_drop | audit_score_drop
  @Column({ type: 'jsonb' }) payload: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
  @Column({ nullable: true }) readAt: Date;
}
```

Add `SeoAlert` type to `src/types/shared.ts`. Generate and run migration.

### 2. AlertsService

File: `src/alerts/alerts.service.ts`

```typescript
createAlert(data: {
  userId: string;
  projectId: string;
  type: string;
  payload: Record<string, unknown>;
}): Promise<SeoAlert>

listForUser(userId: string, opts?: { unreadOnly?: boolean }): Promise<SeoAlert[]>
// Returns max 50 alerts, ordered by createdAt DESC

markRead(id: string, userId: string): Promise<void>
// Throws NotFoundException if not found or doesn't belong to userId

getUnreadCount(userId: string): Promise<number>
```

### 3. RankAlertsProcessor

File: `src/alerts/rank-alerts.processor.ts`

Queue: `alerts`, Job: `check-rank-changes`
Payload: `{ projectId: string; userId: string }`

```typescript
@Process('check-rank-changes')
async handle(job: Job<{ projectId: string; userId: string }>) {
  const { projectId, userId } = job.data;
  const changes = await this.rankService.getBigChanges(projectId, 10);

  for (const c of changes.gains) {
    await this.alertsService.createAlert({
      userId, projectId, type: 'ranking_gain',
      payload: { keyword: c.keyword, from: c.from, to: c.to, change: c.from - c.to },
    });
  }
  for (const c of changes.losses) {
    await this.alertsService.createAlert({
      userId, projectId, type: 'ranking_drop',
      payload: { keyword: c.keyword, from: c.from, to: c.to, change: c.to - c.from },
    });
  }
}
```

Deduplication: before creating an alert, check if an identical alert (same `projectId` + `type` + `payload.keyword`) was already created in the last 24h. Skip if so.

### 4. AlertsCron

File: `src/alerts/alerts.cron.ts`

```typescript
@Cron('0 6 * * *')   // daily at 06:00
async enqueueChecks() {
  const projects = await this.projectsService.getAllWithOwners();
  for (const p of projects) {
    await this.alertsQueue.add(
      'check-rank-changes',
      { projectId: p.id, userId: p.userId },
      { attempts: 2 }
    );
  }
}
```

### 5. AlertsController

File: `src/alerts/alerts.controller.ts`

```
GET   /alerts                  → listForUser (req.user.id), optional ?unreadOnly=true
PATCH /alerts/:id/read         → markRead
GET   /alerts/unread-count     → getUnreadCount
```

All routes with `AuthGuard`.

### 6. AlertsModule

Register: `SeoAlert` entity, controller, service, processor, cron.
Import: `KeywordsModule`, `ProjectsModule`, BullMQ queue `alerts`.

---

## Part B — [WEB] `nexora-web`

### 1. Update Shared Types

Copy `SeoAlert` from `nexora-api/src/types/shared.ts` into `lib/types/shared.ts`.

### 2. Alerts Page

**`app/(app)/alerts/page.tsx`**

Fetches `GET /alerts`. Shows a chronological list of alert cards:
- Icon: green arrow up (gain) or red arrow down (drop)
- Text: `Keyword "seo freelance" moved from position 18 to position 7` (gain) or `... dropped from 6 to 14` (drop)
- Date: relative time ("2 hours ago", "yesterday") — use a small date-formatting helper
- Unread alerts have a highlighted background (different `bg` color)
- Clicking marks as read → `PATCH /alerts/:id/read`, then invalidate query

Empty state: "No alerts yet. They appear here when your rankings change significantly."

### 3. Sidebar Unread Badge

In `app/(app)/layout.tsx`:
- Fetch `GET /alerts/unread-count` on load
- Show badge with count on the "Alerts" sidebar nav item (hide if 0)
- Refresh every 5 minutes via `useQuery` `refetchInterval`

---

## Acceptance Criteria

- [ ] Daily cron enqueues check jobs for all projects
- [ ] Gains and drops correctly detected (threshold: 10 positions)
- [ ] No duplicate alerts for the same keyword within 24h
- [ ] Alerts page shows formatted messages with correct icons
- [ ] Unread badge visible in sidebar and updates after marking read
- [ ] Marking alert as read works
