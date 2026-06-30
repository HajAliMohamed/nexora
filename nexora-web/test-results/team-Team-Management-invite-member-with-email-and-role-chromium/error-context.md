# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: team.spec.ts >> Team Management >> invite member with email and role
- Location: tests\team.spec.ts:32:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('table').locator('text=marie@agence-seo.fr')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('table').locator('text=marie@agence-seo.fr')

```

```yaml
- complementary:
  - link "N Nexora":
    - /url: /agency/dashboard
  - navigation:
    - heading "Vue d'ensemble" [level=4]
    - link "Tableau de bord":
      - /url: /agency/dashboard
    - link "Assistant IA":
      - /url: /agency/assistant
    - heading "Outils SEO" [level=4]
    - link "Projets":
      - /url: /agency/projects
    - link "Mots-clés":
      - /url: /agency/keyword-research
    - link "Alertes":
      - /url: /agency/alerts
    - link "Rapports":
      - /url: /agency/reports
    - heading "Gestion" [level=4]
    - link "Clients":
      - /url: /agency/clients
    - link "Équipe":
      - /url: /agency/team
    - link "Facturation":
      - /url: /agency/billing
    - link "Paramètres":
      - /url: /agency/settings
  - text: A
  - paragraph: Admin
  - paragraph: admin@nexora.io
  - button "Se déconnecter"
- main:
  - text: Rechercher (Cmd+K)
  - button
  - heading "Équipe" [level=1]
  - paragraph: Gérez les membres de votre agence
  - button "Inviter un membre"
  - table:
    - rowgroup:
      - row "Membre Email Rôle Ajouté le Action":
        - columnheader "Membre"
        - columnheader "Email"
        - columnheader "Rôle"
        - columnheader "Ajouté le"
        - columnheader "Action"
    - rowgroup:
      - row "Admin admin@nexora.io Propriétaire 30/06/2026":
        - cell "Admin"
        - cell "admin@nexora.io"
        - cell "Propriétaire"
        - cell "30/06/2026"
        - cell
- region "Notifications alt+T"
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { seedAdmin, loginAsAdmin } from './helpers';
  3  | 
  4  | test.describe('Team Management', () => {
  5  |   test.beforeAll(async () => {
  6  |     await seedAdmin();
  7  |   });
  8  | 
  9  |   test('team page loads with owner', async ({ page, context }) => {
  10 |     await loginAsAdmin(context);
  11 |     await page.goto('/agency/team');
  12 |     await page.waitForTimeout(2000);
  13 | 
  14 |     await expect(page.locator('h1:has-text("Équipe")')).toBeVisible({ timeout: 5000 });
  15 | 
  16 |     const table = page.locator('table');
  17 |     if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
  18 |       await expect(table.locator('text=Propriétaire')).toBeVisible();
  19 |     }
  20 |   });
  21 | 
  22 |   test('invite member modal opens', async ({ page, context }) => {
  23 |     await loginAsAdmin(context);
  24 |     await page.goto('/agency/team');
  25 |     await page.waitForTimeout(2000);
  26 | 
  27 |     await page.locator('button:has-text("Inviter un membre")').click();
  28 |     await expect(page.locator('text=Inviter un membre').last()).toBeVisible();
  29 |     await expect(page.locator('input[placeholder="membre@exemple.com"]')).toBeVisible();
  30 |   });
  31 | 
  32 |   test('invite member with email and role', async ({ page, context }) => {
  33 |     await loginAsAdmin(context);
  34 |     await page.goto('/agency/team');
  35 |     await page.waitForTimeout(2000);
  36 | 
  37 |     await page.locator('button:has-text("Inviter un membre")').click();
  38 |     await page.waitForTimeout(500);
  39 | 
  40 |     await page.locator('input[placeholder="membre@exemple.com"]').fill('marie@agence-seo.fr');
  41 |     await page.locator('select').selectOption('admin');
  42 |     await page.locator('button:has-text("Envoyer l\'invitation")').click();
  43 |     await page.waitForTimeout(2000);
  44 | 
  45 |     await page.goto('/agency/team');
  46 |     await page.waitForTimeout(2000);
  47 | 
  48 |     const table = page.locator('table');
  49 |     if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
> 50 |       await expect(table.locator('text=marie@agence-seo.fr')).toBeVisible({ timeout: 5000 });
     |                                                               ^ Error: expect(locator).toBeVisible() failed
  51 |     }
  52 |   });
  53 | 
  54 |   test('remove member button works', async ({ page, context }) => {
  55 |     await loginAsAdmin(context);
  56 |     await page.goto('/agency/team');
  57 |     await page.waitForTimeout(2000);
  58 | 
  59 |     const removeBtn = page.locator('button:has-text("Retirer")').first();
  60 |     if (await removeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  61 |       await removeBtn.click();
  62 |       await page.waitForTimeout(1000);
  63 |     }
  64 |   });
  65 | });
  66 | 
```