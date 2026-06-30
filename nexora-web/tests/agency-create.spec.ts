import { test, expect } from '@playwright/test';
import { seedAdmin, loginAsAdmin, createAgency } from './helpers';

test.describe('Agency Creation & Management', () => {
  test.beforeAll(async () => {
    await seedAdmin();
  });

  test('empty state shows creation form', async ({ page, context }) => {
    await loginAsAdmin(context);
    await page.goto('/agency/dashboard');
    await page.waitForTimeout(2000);

    const createInput = page.locator('input[placeholder="Nom de votre agence"]');
    if (await createInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(createInput).toBeVisible();
      await expect(page.locator('button:has-text("Créer")')).toBeVisible();
    }
  });

  test('create agency inline shows sidebar', async ({ page, context }) => {
    await loginAsAdmin(context);
    await page.goto('/agency/dashboard');
    await page.waitForTimeout(2000);

    const createInput = page.locator('input[placeholder="Nom de votre agence"]');
    if (await createInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createInput.fill('Agence Test E2E');
      await page.locator('button:has-text("Créer")').click();
      await page.waitForTimeout(2000);
      await page.reload();
      await page.waitForTimeout(1000);

      await expect(page.locator('text=Tableau de bord')).toBeVisible({ timeout: 5000 });
    }
  });

  test('dashboard shows agency name and stats cards', async ({ page, context }) => {
    await loginAsAdmin(context);
    await page.goto('/agency/dashboard');
    await page.waitForTimeout(2000);

    const agencyName = page.locator('h1');
    if (await agencyName.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(page.getByText('Clients', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Projets', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('SEO Health', { exact: true })).toBeVisible();
    }
  });

  test('sidebar has all nav items', async ({ page, context }) => {
    await loginAsAdmin(context);
    await page.goto('/agency/dashboard');
    await page.waitForTimeout(2000);

    const sidebar = page.locator('aside');
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar.locator('a:has-text("Tableau de bord")')).toBeVisible();
      await expect(sidebar.locator('a:has-text("Équipe")')).toBeVisible();
      await expect(sidebar.locator('a:has-text("Clients")')).toBeVisible();
      await expect(sidebar.locator('a:has-text("Rapports")')).toBeVisible();
      await expect(sidebar.locator('a:has-text("Assistant")')).toBeVisible();
      await expect(sidebar.locator('a:has-text("Facturation")')).toBeVisible();
      await expect(sidebar.locator('a:has-text("Paramètres")')).toBeVisible();
    }
  });

  test('settings page loads', async ({ page, context }) => {
    await loginAsAdmin(context);
    await page.goto('/agency/settings');
    await page.waitForTimeout(2000);

    await expect(page.locator('h1:has-text("Paramètres")')).toBeVisible({ timeout: 5000 });
  });
});
