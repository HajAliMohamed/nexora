# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: client-projects.spec.ts >> Client Projects >> project detail page shows reports list
- Location: tests\client-projects.spec.ts:143:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Test Project')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Test Project')

```

```yaml
- heading "404" [level=1]
- heading "This page could not be found." [level=2]
- region "Notifications alt+T"
- alert
```

# Test source

```ts
  54  |   const cookie = cookies.map(c => c.split(';')[0]).join('; ');
  55  | 
  56  |   const res = await fetch(`${API_URL}/agencies/${agencyId}/clients/invite`, {
  57  |     method: 'POST',
  58  |     headers: { 'Content-Type': 'application/json', Cookie: cookie },
  59  |     body: JSON.stringify({ email, name: 'E2E Test Client' }),
  60  |   });
  61  |   const data = await res.json() as { id: string };
  62  |   return data.id;
  63  | }
  64  | 
  65  | async function assignProjectViaApi(agencyId: string, clientId: string, projectId: string): Promise<void> {
  66  |   const loginRes = await fetch(`${API_URL}/auth/login`, {
  67  |     method: 'POST',
  68  |     headers: { 'Content-Type': 'application/json' },
  69  |     body: JSON.stringify({ email: 'admin@nexora.io', password: 'changeme123' }),
  70  |   });
  71  |   const cookies = loginRes.headers.getSetCookie?.() || [];
  72  |   const cookie = cookies.map(c => c.split(';')[0]).join('; ');
  73  | 
  74  |   await fetch(`${API_URL}/agencies/${agencyId}/clients/${clientId}/projects/${projectId}/assign`, {
  75  |     method: 'PATCH',
  76  |     headers: { 'Content-Type': 'application/json', Cookie: cookie },
  77  |   });
  78  | }
  79  | 
  80  | async function loginAsClientViaApi(context: any, email: string): Promise<void> {
  81  |   const sendRes = await fetch(`${API_URL}/auth/magic-link/send`, {
  82  |     method: 'POST',
  83  |     headers: { 'Content-Type': 'application/json' },
  84  |     body: JSON.stringify({ email }),
  85  |   });
  86  |   const sendData = await sendRes.json() as { ok: boolean; url?: string };
  87  | 
  88  |   if (sendData.ok && sendData.url) {
  89  |     const tokenMatch = sendData.url.match(/token=([^&]+)/);
  90  |     if (tokenMatch) {
  91  |       const verifyRes = await fetch(`${API_URL}/auth/magic-link/verify?token=${tokenMatch[1]}`, {
  92  |         redirect: 'manual',
  93  |       });
  94  |       const cookies = verifyRes.headers.getSetCookie?.() || [];
  95  |       for (const header of cookies) {
  96  |         const [cookiePart] = header.split(';');
  97  |         const [name, value] = cookiePart.split('=');
  98  |         if (name && value) {
  99  |           await context.addCookies([{
  100 |             name: name.trim(),
  101 |             value: value.trim(),
  102 |             domain: 'localhost',
  103 |             path: '/',
  104 |           }]);
  105 |         }
  106 |       }
  107 |     }
  108 |   }
  109 | }
  110 | 
  111 | test.describe('Client Projects', () => {
  112 |   test.beforeAll(async () => {
  113 |     await seedAdmin();
  114 |   });
  115 | 
  116 |   test('client projects page shows empty state', async ({ page, context }) => {
  117 |     const agencyId = await createAgencyViaApi();
  118 |     const clientEmail = `e2e-empty-${Date.now()}@test.com`;
  119 |     await inviteClientViaApi(agencyId, clientEmail);
  120 |     await loginAsClientViaApi(context, clientEmail);
  121 | 
  122 |     await page.goto('/client/projects');
  123 |     await page.waitForTimeout(2000);
  124 | 
  125 |     await expect(page.locator('text=Aucun projet pour le moment')).toBeVisible({ timeout: 5000 });
  126 |   });
  127 | 
  128 |   test('client projects page shows assigned projects', async ({ page, context }) => {
  129 |     const agencyId = await createAgencyViaApi();
  130 |     const projectId = await createProjectViaApi(agencyId);
  131 |     const clientEmail = `e2e-assigned-${Date.now()}@test.com`;
  132 |     const clientId = await inviteClientViaApi(agencyId, clientEmail);
  133 |     await assignProjectViaApi(agencyId, clientId, projectId);
  134 |     await loginAsClientViaApi(context, clientEmail);
  135 | 
  136 |     await page.goto('/client/projects');
  137 |     await page.waitForTimeout(2000);
  138 | 
  139 |     await expect(page.locator('text=Test Project')).toBeVisible({ timeout: 5000 });
  140 |     await expect(page.locator('text=test-example.com')).toBeVisible({ timeout: 3000 });
  141 |   });
  142 | 
  143 |   test('project detail page shows reports list', async ({ page, context }) => {
  144 |     const agencyId = await createAgencyViaApi();
  145 |     const projectId = await createProjectViaApi(agencyId);
  146 |     const clientEmail = `e2e-detail-${Date.now()}@test.com`;
  147 |     const clientId = await inviteClientViaApi(agencyId, clientEmail);
  148 |     await assignProjectViaApi(agencyId, clientId, projectId);
  149 |     await loginAsClientViaApi(context, clientEmail);
  150 | 
  151 |     await page.goto(`/client/projects/${projectId}`);
  152 |     await page.waitForTimeout(2000);
  153 | 
> 154 |     await expect(page.locator('text=Test Project')).toBeVisible({ timeout: 5000 });
      |                                                     ^ Error: expect(locator).toBeVisible() failed
  155 |     await expect(page.locator('text=Aucun rapport disponible')).toBeVisible({ timeout: 5000 });
  156 |   });
  157 | });
  158 | 
```