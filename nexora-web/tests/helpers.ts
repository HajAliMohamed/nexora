import { type Page, type BrowserContext } from '@playwright/test';

const API_URL = 'http://localhost:3001';

export async function seedAdmin(): Promise<void> {
  await fetch(`${API_URL}/auth/seed-admin`, { method: 'POST' });
}

export async function loginAsAdmin(context: BrowserContext): Promise<void> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@nexora.io', password: 'changeme123' }),
  });

  const setCookieHeaders = response.headers.getSetCookie?.() || [];
  for (const header of setCookieHeaders) {
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
}

export async function createAgency(page: Page, name: string): Promise<void> {
  await page.goto('/agency/dashboard');
  const nameInput = page.locator('input[placeholder="Nom de votre agence"]');
  if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await nameInput.fill(name);
    await page.locator('button:has-text("Créer")').click();
    await page.waitForResponse(resp => resp.url().includes('/agencies') && resp.status() === 201);
    await page.waitForTimeout(500);
  }
}
