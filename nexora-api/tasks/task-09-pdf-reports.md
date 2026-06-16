# Task 09 [API + WEB] — PDF Reports

> Read `AGENTS.md` and `NEXORA_DOCS.md` section 6 (reports endpoints) before starting.
> API: Tasks 02a, 03a, 07 must be complete. Web: Task 02b, 03b, 07 must be complete.
> PDF export is a **Pro/Agency only** feature — enforce this.

---

## Part A — [API] `nexora-api`

### 1. ReportsModule

File: `src/reports/reports.module.ts`, `reports.service.ts`, `reports.controller.ts`

### 2. ReportsService

```typescript
generateAuditPdf(auditId: string): Promise<Buffer>
generateRankingsPdf(projectId: string): Promise<Buffer>
```

Use **Puppeteer** to render HTML → PDF.

**Audit PDF content:**
```
Header: Nexora — SEO Audit Report
Project: [name] ([domain])
Date: [audit date]

Global Score: [score]/100

Category Scores:
| Category     | Score |
| Technical    | 28/30 |
| On-page      | 20/25 |
| Performance  | 14/20 |
| Crawlability | 12/15 |
| Content      |  7/10 |

Issues by Severity:
| Severity | Count |
| Critical |     0 |
| High     |     3 |
| Medium   |     8 |
| Low      |     7 |

Top Issues (first 50):
| URL | Type | Severity | Message |
...
```

**Rankings PDF content:**
```
Header: Nexora — Rankings Report
Project: [name] ([domain])
Date: [today]

Keywords Tracked: [count]
Average Position: [avg]
Gained (30d): [count]
Lost (30d): [count]

Keywords:
| Keyword | Country | Device | Current Position | Change (7d) |
...
```

Puppeteer setup:
```typescript
const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.setContent(htmlString, { waitUntil: 'networkidle0' });
const pdf = await page.pdf({ format: 'A4', printBackground: true });
await browser.close();
return pdf;
```

Build HTML as a template string with inline CSS (no Tailwind in PDF context).

### 3. ReportsController

```
GET /reports/audit/:auditId/pdf
GET /reports/project/:projectId/rankings/pdf
```

Both routes:
1. Auth required
2. Check `canExportPdf(req.user.id)` from `LimitsService` — throw `ForbiddenException('PDF export requires a Pro or Agency plan')` if false
3. Generate PDF buffer
4. Return with headers:
   ```typescript
   res.set({
     'Content-Type': 'application/pdf',
     'Content-Disposition': `attachment; filename="nexora-audit-${auditId}.pdf"`,
   });
   res.send(buffer);
   ```

Use `@Res() res: Response` from `express`.

### 4. ReportsModule Registration

Import: `AuditsModule`, `KeywordsModule`, `BillingModule`, `ProjectsModule`.

---

## New Dependencies (API)

```bash
pnpm add puppeteer
```

Note: Puppeteer downloads Chromium (~170MB) on install. Set `PUPPETEER_CACHE_DIR=/tmp/puppeteer` in Docker environment to avoid re-downloading on every deploy.

---

## Part B — [WEB] `nexora-web`

### 1. Export Buttons

Add "Export PDF" button on:
- `app/(app)/projects/[projectId]/audits/[auditId]/page.tsx` — at the top of the page
- `app/(app)/projects/[projectId]/rankings/page.tsx` — at the top of the page

Button behavior:
- If user is on Free plan (`canExportPdf` false from `/me/usage` — or derive from `limits.pdfExport`): show button disabled with tooltip "Available on Pro & Agency plans"
- If Pro/Agency: clicking triggers download
- Show loading spinner while generating (3–5s)

Download trigger:
```typescript
const handleExport = async () => {
  const res = await fetch(`${API_URL}/reports/audit/${auditId}/pdf`, { credentials: 'include' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message || res.statusText);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nexora-audit-${auditId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};
```

(Don't use `apiFetch` here since it auto-parses JSON — use raw `fetch` with the same `API_URL` base and `credentials: 'include'`.)

---

## Acceptance Criteria

- [ ] PDF generated with correct content for both report types
- [ ] PDF download triggers in browser with correct filename
- [ ] Free plan users see disabled button with tooltip
- [ ] Pro/Agency users can download successfully
- [ ] No browser crash (Puppeteer sandbox flags set)
- [ ] 403 handled gracefully if plan check somehow fails client-side
