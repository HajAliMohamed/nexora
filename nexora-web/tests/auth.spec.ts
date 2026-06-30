import { test, expect } from '@playwright/test';
import { seedAdmin, loginAsAdmin } from './helpers';

const API_URL = 'http://localhost:3001';

test.describe('Auth Flow', () => {
  test.beforeAll(async () => {
    await seedAdmin();
  });

  test('login page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Connexion à Nexora');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('login with wrong credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('wrong@test.com');
    await page.locator('input[type="password"]').fill('wrongpass');
    await page.locator('button:has-text("Se connecter")').click();
    await expect(page.locator('.bg-destructive\\/10')).toBeVisible({ timeout: 5000 });
  });

  test('login with admin credentials redirects to dashboard', async ({ page, context }) => {
    await loginAsAdmin(context);
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).not.toContain('/login');
  });

  test('signup page renders', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('h1')).toContainText('Créez votre compte');
  });

  test('signup with new user redirects to dashboard', async ({ page }) => {
    const email = `test${Date.now()}@example.com`;
    await page.goto('/signup');
    await page.locator('input[placeholder="Votre nom"]').fill('Test User');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill('testpass123');
    await page.locator('button:has-text("Créer mon compte")').click();
    await page.waitForURL('**/dashboard', { timeout: 5000 });
  });

  test('logout clears session', async ({ page, context }) => {
    await loginAsAdmin(context);
    await page.goto('/agency/dashboard');
    await page.waitForTimeout(1000);

    const logoutBtn = page.locator('button:has-text("Déconnexion")');
    await expect(logoutBtn).toBeVisible({ timeout: 3000 });

    await page.evaluate(() => fetch('http://localhost:3001/auth/logout', { method: 'POST', credentials: 'include' }));
    await page.waitForTimeout(1000);

    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Connexion à Nexora', { timeout: 5000 });
  });
});
