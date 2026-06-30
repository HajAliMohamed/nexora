import { test, expect } from '@playwright/test';
import { seedAdmin, loginAsAdmin } from './helpers';

const API_URL = 'http://localhost:3001';

async function createAgencyViaApi(): Promise<string> {
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@nexora.io', password: 'changeme123' }),
  });
  const cookies = loginRes.headers.getSetCookie?.() || [];
  const cookie = cookies.map(c => c.split(';')[0]).join('; ');

  const res = await fetch(`${API_URL}/agencies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ name: `Test Agency ${Date.now()}`, slug: `test-${Date.now()}` }),
  });
  const data = await res.json() as { id: string };
  return data.id;
}

async function createProjectViaApi(agencyId: string): Promise<string> {
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@nexora.io', password: 'changeme123' }),
  });
  const cookies = loginRes.headers.getSetCookie?.() || [];
  const cookie = cookies.map(c => c.split(';')[0]).join('; ');

  const res = await fetch(`${API_URL}/agencies/${agencyId}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      name: 'Test Project',
      domain: 'test-example.com',
      countryCode: 'FR',
      languageCode: 'fr',
    }),
  });
  const data = await res.json() as { id: string };
  return data.id;
}

async function inviteClientViaApi(agencyId: string, email: string): Promise<string> {
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@nexora.io', password: 'changeme123' }),
  });
  const cookies = loginRes.headers.getSetCookie?.() || [];
  const cookie = cookies.map(c => c.split(';')[0]).join('; ');

  const res = await fetch(`${API_URL}/agencies/${agencyId}/clients/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ email, name: 'E2E Test Client' }),
  });
  const data = await res.json() as { id: string };
  return data.id;
}

async function assignProjectViaApi(agencyId: string, clientId: string, projectId: string): Promise<void> {
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@nexora.io', password: 'changeme123' }),
  });
  const cookies = loginRes.headers.getSetCookie?.() || [];
  const cookie = cookies.map(c => c.split(';')[0]).join('; ');

  await fetch(`${API_URL}/agencies/${agencyId}/clients/${clientId}/projects/${projectId}/assign`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
  });
}

async function loginAsClientViaApi(context: any, email: string): Promise<void> {
  const sendRes = await fetch(`${API_URL}/auth/magic-link/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const sendData = await sendRes.json() as { ok: boolean; url?: string };

  if (sendData.ok && sendData.url) {
    const tokenMatch = sendData.url.match(/token=([^&]+)/);
    if (tokenMatch) {
      const verifyRes = await fetch(`${API_URL}/auth/magic-link/verify?token=${tokenMatch[1]}`, {
        redirect: 'manual',
      });
      const cookies = verifyRes.headers.getSetCookie?.() || [];
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
    }
  }
}

test.describe('Client Projects', () => {
  test.beforeAll(async () => {
    await seedAdmin();
  });

  test('client projects page shows empty state', async ({ page, context }) => {
    const agencyId = await createAgencyViaApi();
    const clientEmail = `e2e-empty-${Date.now()}@test.com`;
    await inviteClientViaApi(agencyId, clientEmail);
    await loginAsClientViaApi(context, clientEmail);

    await page.goto('/client/projects');
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Aucun projet pour le moment')).toBeVisible({ timeout: 5000 });
  });

  test('client projects page shows assigned projects', async ({ page, context }) => {
    const agencyId = await createAgencyViaApi();
    const projectId = await createProjectViaApi(agencyId);
    const clientEmail = `e2e-assigned-${Date.now()}@test.com`;
    const clientId = await inviteClientViaApi(agencyId, clientEmail);
    await assignProjectViaApi(agencyId, clientId, projectId);
    await loginAsClientViaApi(context, clientEmail);

    await page.goto('/client/projects');
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Test Project')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=test-example.com')).toBeVisible({ timeout: 3000 });
  });

  test('project detail page shows reports list', async ({ page, context }) => {
    const agencyId = await createAgencyViaApi();
    const projectId = await createProjectViaApi(agencyId);
    const clientEmail = `e2e-detail-${Date.now()}@test.com`;
    const clientId = await inviteClientViaApi(agencyId, clientEmail);
    await assignProjectViaApi(agencyId, clientId, projectId);
    await loginAsClientViaApi(context, clientEmail);

    await page.goto(`/client/projects/${projectId}`);
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Test Project')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Aucun rapport disponible')).toBeVisible({ timeout: 5000 });
  });
});
