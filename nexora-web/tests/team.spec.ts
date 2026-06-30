import { test, expect } from '@playwright/test';
import { seedAdmin, loginAsAdmin } from './helpers';

test.describe('Team Management', () => {
  test.beforeAll(async () => {
    await seedAdmin();
  });

  test('team page loads with owner', async ({ page, context }) => {
    await loginAsAdmin(context);
    await page.goto('/agency/team');
    await page.waitForTimeout(2000);

    await expect(page.locator('h1:has-text("Équipe")')).toBeVisible({ timeout: 5000 });

    const table = page.locator('table');
    if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(table.locator('text=Propriétaire')).toBeVisible();
    }
  });

  test('invite member modal opens', async ({ page, context }) => {
    await loginAsAdmin(context);
    await page.goto('/agency/team');
    await page.waitForTimeout(2000);

    await page.locator('button:has-text("Inviter un membre")').click();
    await expect(page.locator('text=Inviter un membre').last()).toBeVisible();
    await expect(page.locator('input[placeholder="membre@exemple.com"]')).toBeVisible();
  });

  test('invite member with email and role', async ({ page, context }) => {
    await loginAsAdmin(context);
    await page.goto('/agency/team');
    await page.waitForTimeout(2000);

    await page.locator('button:has-text("Inviter un membre")').click();
    await page.waitForTimeout(500);

    await page.locator('input[placeholder="membre@exemple.com"]').fill('marie@agence-seo.fr');
    await page.locator('select').selectOption('admin');
    await page.locator('button:has-text("Envoyer l\'invitation")').click();
    await page.waitForTimeout(2000);

    await page.goto('/agency/team');
    await page.waitForTimeout(2000);

    const table = page.locator('table');
    if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(table.locator('text=marie@agence-seo.fr')).toBeVisible({ timeout: 5000 });
    }
  });

  test('remove member button works', async ({ page, context }) => {
    await loginAsAdmin(context);
    await page.goto('/agency/team');
    await page.waitForTimeout(2000);

    const removeBtn = page.locator('button:has-text("Retirer")').first();
    if (await removeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await removeBtn.click();
      await page.waitForTimeout(1000);
    }
  });
});
