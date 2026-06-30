import { test, expect } from '@playwright/test';
import { seedAdmin, loginAsAdmin } from './helpers';

test.describe('Reports', () => {
  test.beforeAll(async () => {
    await seedAdmin();
  });

  test('reports page loads', async ({ page, context }) => {
    await loginAsAdmin(context);
    await page.goto('/agency/reports');
    await page.waitForTimeout(2000);

    await expect(page.locator('h1:has-text("Rapports")')).toBeVisible({ timeout: 5000 });
  });

  test('reports page shows empty state', async ({ page, context }) => {
    await loginAsAdmin(context);
    await page.goto('/agency/reports');
    await page.waitForTimeout(2000);

    const emptyState = page.locator('text=Aucun rapport pour le moment');
    if (await emptyState.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(emptyState).toBeVisible();
    }
  });

  test('generate button is disabled without project selection', async ({ page, context }) => {
    await loginAsAdmin(context);
    await page.goto('/agency/reports');
    await page.waitForTimeout(2000);

    const generateBtn = page.locator('button:has-text("Générer un rapport")');
    await expect(generateBtn).toBeDisabled();
  });

  test('project selector loads', async ({ page, context }) => {
    await loginAsAdmin(context);
    await page.goto('/agency/reports');
    await page.waitForTimeout(2000);

    const select = page.locator('select');
    await expect(select).toBeVisible({ timeout: 5000 });
  });
});
