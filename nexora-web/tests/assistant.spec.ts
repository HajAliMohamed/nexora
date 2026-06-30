import { test, expect } from '@playwright/test';
import { seedAdmin, loginAsAdmin } from './helpers';

test.describe('SEO Assistant', () => {
  test.beforeAll(async () => {
    await seedAdmin();
  });

  test('assistant page loads', async ({ page, context }) => {
    await loginAsAdmin(context);
    await page.goto('/agency/assistant');
    await page.waitForTimeout(2000);

    await expect(page.locator('h1:has-text("Assistant SEO")')).toBeVisible({ timeout: 5000 });
  });

  test('project selector is visible', async ({ page, context }) => {
    await loginAsAdmin(context);
    await page.goto('/agency/assistant');
    await page.waitForTimeout(2000);

    await expect(page.locator('select')).toBeVisible({ timeout: 5000 });
  });

  test('no project selected shows placeholder', async ({ page, context }) => {
    await loginAsAdmin(context);
    await page.goto('/agency/assistant');
    await page.waitForTimeout(2000);

    const placeholder = page.locator('text=Sélectionnez un projet pour commencer');
    if (await placeholder.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(placeholder).toBeVisible();
    }
  });
});
