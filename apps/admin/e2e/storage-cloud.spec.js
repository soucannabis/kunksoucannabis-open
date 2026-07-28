import { test, expect } from '@playwright/test';
import { ensureAdminUser } from './helpers/db.js';
import { ADMIN_EMAIL, ADMIN_PASSWORD, API_URL, appUrl } from './helpers/fixtures.js';
import { loginInBrowser } from './helpers/api.js';
import {
  requireActiveCloudBucket,
  uploadDocument,
  expectedFileUrl,
  TINY_JPEG,
} from './helpers/storageCloud.js';

test.describe('armazenamento cloud — bucket ativo', () => {
  test.beforeAll(async () => {
    await ensureAdminUser();
  });

  test('upload grava no bucket e URL lógica é /files/:id/download', async ({
    page,
    request,
    playwright,
  }) => {
    const { driver } = await requireActiveCloudBucket(playwright);

    const login = await request.post(`${API_URL}/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      headers: { 'X-Kunk-App': 'admin' },
      failOnStatusCode: false,
    });
    expect(login.status()).toBe(200);

    const filename = `admin-cloud-${Date.now()}.jpg`;
    const up = await uploadDocument(request, { filename, buffer: TINY_JPEG });
    expect(up.status, JSON.stringify(up.body)).toBe(201);
    expect(up.data?.id).toBeTruthy();
    expect(up.data.url).toBe(expectedFileUrl(up.data.id));
    expect(up.data.storage_driver).toBe(driver);
    expect(up.data.storage_key).toBeTruthy();
    expect(String(up.data.storage_key)).not.toMatch(/^\/|^[A-Za-z]:\\/);

    const meta = await request.get(`${API_URL}/files/${up.data.id}`, { failOnStatusCode: false });
    expect(meta.status()).toBe(200);
    const metaBody = await meta.json();
    expect(metaBody.data.url).toBe(expectedFileUrl(up.data.id));
    expect(metaBody.data.storage_driver).toBe(driver);

    const dl = await request.get(`${API_URL}/files/${up.data.id}/download`, {
      failOnStatusCode: false,
    });
    expect(dl.status()).toBe(200);
    const bytes = Buffer.from(await dl.body());
    expect(bytes.equals(TINY_JPEG)).toBe(true);

    await loginInBrowser(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/home\/?$/);
    // Página Arquivos removida do Admin — download via API já validado acima.
    await request.delete(`${API_URL}/files/${up.data.id}`, { failOnStatusCode: false });
  });
});
