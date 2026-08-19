import { test, expect } from '@playwright/test';
import { ensureAdminUser } from './helpers/db.js';
import { ADMIN_EMAIL, ADMIN_PASSWORD, API_URL } from './helpers/fixtures.js';
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
    request,
    playwright,
  }) => {
    const { driver } = await requireActiveCloudBucket(playwright);

    const login = await request.post(`${API_URL}/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      headers: { 'X-Kunk-App': 'kunk' },
      failOnStatusCode: false,
    });
    expect(login.status()).toBe(200);

    const filename = `kunk-cloud-${Date.now()}.jpg`;
    const up = await uploadDocument(request, { filename, buffer: TINY_JPEG });
    expect(up.status, JSON.stringify(up.body)).toBe(201);
    expect(up.data?.id).toBeTruthy();
    expect(up.data.url).toBe(expectedFileUrl(up.data.id));
    expect(up.data.storage_driver).toBe(driver);
    expect(up.data.storage_key).toBeTruthy();

    const dl = await request.get(`${API_URL}/files/${up.data.id}/download`, {
      failOnStatusCode: false,
    });
    expect(dl.status()).toBe(200);
    const bytes = Buffer.from(await dl.body());
    expect(bytes.equals(TINY_JPEG)).toBe(true);

    await request.delete(`${API_URL}/files/${up.data.id}`, { failOnStatusCode: false });
  });
});
