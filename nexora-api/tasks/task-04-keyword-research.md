# Task 04 [API + WEB] — Keyword Research

> Read `AGENTS.md` and `NEXORA_DOCS.md` sections 5, 6, 13 before starting.
> API: Tasks 01a and 03a must be complete. Web: Tasks 01b and 03b must be complete.

---

## Part A — [API] `nexora-api`

### 1. KeywordResearchService

File: `src/keyword-research/keyword-research.service.ts`

```typescript
async search(params: {
  query: string;
  countryCode: string;
  languageCode: string;
  userId: string;
}): Promise<KeywordResearchResult[]>
```

```typescript
// add to src/types/shared.ts
export type KeywordResearchResult = {
  keyword: string;
  volume: number;
  cpc: number;
  difficulty: number;
  competition: number;  // 0–1
};
```

**Implementation:**

1. **Redis cache check** — cache key: `kw-research:${query}:${countryCode}:${languageCode}`, TTL: 24h
   - If cached, return parsed value immediately (does not count against daily limit)

2. **Daily limit check** — Redis key: `kw-limit:${userId}:${date}` (date = YYYY-MM-DD)
   - Get current count. If >= plan limit (`maxKeywordSearchesPerDay`), throw `ForbiddenException('Daily search limit reached')`

3. **API call** to keyword provider, configurable via `KEYWORDS_PROVIDER` env var:

   **DataForSEO (`dataforseo`):**
   - `POST https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live`
   - Auth: Basic auth `KEYWORDS_API_LOGIN:KEYWORDS_API_PASSWORD`
   - Body: `[{ keywords: [query, ...suggestions], location_code, language_code }]`
   - Also call `POST .../keywords_data/google_ads/keywords_for_keywords/live` for suggestions
   - Normalize response to `KeywordResearchResult[]`

   **Mock provider (`mock`)** — for dev/testing:
   - Return 10 fake keywords derived from the query with random but realistic numbers
   - Use when `KEYWORDS_PROVIDER=mock`

4. **Increment daily counter** — `INCR kw-limit:${userId}:${date}`, set TTL to 25h if key is new

5. **Cache result** — store normalized results in Redis for 24h

6. **Return results**

Update `LimitsService` to expose `getMaxKeywordSearchesPerDay(userId): Promise<number>` using `PLAN_LIMITS` from `src/types/shared.ts`.

### 2. KeywordResearchController

File: `src/keyword-research/keyword-research.controller.ts`

```
GET /keyword-research/search?query=...&country=fr&language=fr
POST /keyword-research/add-to-project
```

`GET /keyword-research/search`:
- Auth required
- Calls `keywordResearchService.search({ query, countryCode: country, languageCode: language, userId: req.user.id })`
- Returns `KeywordResearchResult[]`

`POST /keyword-research/add-to-project`:
- Body: `{ keyword: string; projectId: string; countryCode: string; languageCode: string; device: string }`
- Calls `rankTrackingService.addKeyword(...)`
- Returns created `Keyword`

### 3. KeywordResearchModule

Register: controller, service.
Import: `BillingModule`, `KeywordsModule` (for add-to-project), Redis via `@songkeys/nestjs-redis`.

```bash
pnpm add @songkeys/nestjs-redis ioredis
pnpm add @types/ioredis -D
```

Inject Redis directly:
```typescript
constructor(@InjectRedis() private readonly redis: IORedis) {}
```

### 4. Update Shared Types

Add `KeywordResearchResult` to `src/types/shared.ts`.

---

## Part B — [WEB] `nexora-web`

### 1. Update Shared Types

Copy `KeywordResearchResult` from `nexora-api/src/types/shared.ts` into `lib/types/shared.ts`.

### 2. Keyword Research Page

**`app/(app)/keyword-research/page.tsx`**

Layout:
```
[ Search input ] [ Country dropdown ] [ Language dropdown ] [ Search button ]

X/Y searches used today

─────────────────────────────────────────
Results table (only shown after search):
Keyword | Volume | CPC | Difficulty | Competition | [ + Add to project ]
─────────────────────────────────────────
```

Behavior:
- Search triggers `GET /keyword-research/search?...` via `useQuery` (enabled only on submit, not on every keystroke)
- Loading state: skeleton rows
- "Add to project" button opens a small modal/dropdown to select which project to add to
  - On confirm: calls `POST /keyword-research/add-to-project`
  - Shows toast success/error (use shadcn/ui toast)
- Difficulty displayed as a colored badge: 0–33 = green (Easy), 34–66 = yellow (Medium), 67–100 = red (Hard)
- Table sortable by: volume (default desc), CPC, difficulty
- "X/Y searches used today" — fetch from `GET /me/usage`
- Show 403 error message clearly if daily limit reached, with link to `/billing`

---

## Acceptance Criteria

- [ ] Search returns results in < 2s (from cache if repeated)
- [ ] Same query+country+language combo cached — no second API call within 24h
- [ ] Daily search limit enforced per user per plan
- [ ] "Add to project" successfully creates a tracked keyword
- [ ] Mock provider works for local dev without real API keys
- [ ] Table sorts correctly
- [ ] Daily usage counter displayed and accurate
