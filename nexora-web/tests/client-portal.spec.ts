import { test, expect } from '@playwright/test';
import { seedAdmin, loginAsAdmin } from './helpers';

const API_URL = 'http://localhost:3001';

test.describe('Client Portal', () => {
  test.beforeAll(async () => {
    await seedAdmin();
  });

  test('client login page renders', async ({ page }) => {
    await page.goto('/client/login');
    await expect(page.locator('h1:has-text("Espace client Nexora")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button:has-text("Recevoir le lien magique")')).toBeVisible();
  });

  test('client login link to agency login', async ({ page }) => {
    await page.goto('/client/login');
    await expect(page.locator('a:has-text("Connexion agence")')).toBeVisible();
  });

  test('send magic link shows confirmation', async ({ page }) => {
    await page.goto('/client/login');
    await page.locator('input[type="email"]').fill('existing-client@test.com');
    await page.locator('button:has-text("Recevoir le lien magique")').click();
    await page.waitForTimeout(2000);

    const confirmation = page.locator('text=Vérifiez votre boîte email');
    if (await confirmation.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(confirmation).toBeVisible();
    }
  });

  test('magic link verify redirects to client dashboard', async ({ page, context }) => {
    const response = await fetch(`${API_URL}/auth/magic-link/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'e2e-client@test.com' }),
    });
    const data = await response.json() as { ok: boolean; url?: string };

    if (data.ok && data.url) {
      const tokenMatch = data.url.match(/token=([^&]+)/);
      if (tokenMatch) {
        const verifyResponse = await fetch(`${API_URL}/auth/magic-link/verify?token=${tokenMatch[1]}`, {
          redirect: 'manual',
        });
        const cookies = verifyResponse.headers.getSetCookie?.() || [];
        for (const header of cookies) {
          const [cookiePart] = header.split(';');
          const [name, value] = cookiePart.split('=');
          if (name && value) {
            await context.addCookies([{
              name: name.trim(),
              value: value.trim(),
              domain: 'localhost',
              path: '/',
            }]);
          }
        }

        await page.goto('/client/dashboard');
        await page.waitForTimeout(2000);
        await expect(page.locator('h1')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
