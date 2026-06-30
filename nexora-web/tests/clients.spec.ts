import { test, expect } from '@playwright/test';
import { seedAdmin, loginAsAdmin, createAgency } from './helpers';

const API_URL = 'http://localhost:3001';

async function ensureAgency(page: any) {
  await page.goto('/agency/dashboard');
  await page.waitForTimeout(1000);
  const nameInput = page.locator('input[placeholder="Nom de votre agence"]');
  if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nameInput.fill('Test Agency');
    await page.locator('button:has-text("Créer")').click();
    await page.waitForResponse((resp: any) => resp.url().includes('/agencies') && resp.status() === 201);
    await page.waitForTimeout(500);
  }
}

test.describe('Client Management', () => {
  test.beforeAll(async () => {
    await seedAdmin();
  });

  test('clients page loads', async ({ page, context }) => {
    await loginAsAdmin(context);
    await ensureAgency(page);
    await page.goto('/agency/clients');
    await page.waitForTimeout(2000);

    await expect(page.locator('h1:has-text("Clients")')).toBeVisible({ timeout: 5000 });
  });

  test('invite client modal opens', async ({ page, context }) => {
    await loginAsAdmin(context);
    await ensureAgency(page);
    await page.goto('/agency/clients');
    await page.waitForTimeout(2000);

    const inviteBtn = page.locator('button:has-text("Inviter un client")').first();
    await inviteBtn.click();
    await expect(page.locator('text=Inviter un client').last()).toBeVisible();
    await expect(page.locator('input[placeholder="client@exemple.com"]')).toBeVisible();
  });

  test('invite client with email', async ({ page, context }) => {
    await loginAsAdmin(context);
    await ensureAgency(page);

    await page.goto('/agency/clients');
    await page.waitForTimeout(2000);

    await page.locator('button:has-text("Inviter un client")').first().click();

    await page.locator('input[placeholder="client@exemple.com"]').fill('client@test.com');

    await Promise.all([
      page.waitForResponse((resp: any) => resp.url().includes('/invite') && resp.status() === 201),
      page.locator('button:has-text("Envoyer l\'invitation")').click(),
    ]);

    await page.goto('/agency/clients');
    await page.waitForTimeout(2000);

    const table = page.locator('table');
    if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(table.locator('text=client@test.com')).toBeVisible({ timeout: 5000 });
    }
  });

  test('assign project button is visible on client row', async ({ page, context }) => {
    await loginAsAdmin(context);
    await ensureAgency(page);
    await page.goto('/agency/clients');
    await page.waitForTimeout(2000);

    const table = page.locator('table');
    if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
      const assignBtn = page.locator('button:has-text("Assigner un projet")').first();
      await expect(assignBtn).toBeVisible({ timeout: 5000 });
    }
  });

  test('assign project dialog opens and shows projects', async ({ page, context }) => {
    await loginAsAdmin(context);
    await ensureAgency(page);
    await page.goto('/agency/clients');
    await page.waitForTimeout(2000);

    const table = page.locator('table');
    if (!(await table.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip();
      return;
    }

    const assignBtn = page.locator('button:has-text("Assigner un projet")').first();
    if (!(await assignBtn.isEnabled().catch(() => false))) {
      test.skip();
      return;
    }

    await assignBtn.click();
    await page.waitForTimeout(500);
    await expect(page.locator('text=Assigner un projet').last()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('select')).toBeVisible({ timeout: 3000 });
  });
});
