import { test, expect } from '@playwright/test';
import { ensureAdminUser } from './helpers/db.js';
import { ADMIN_EMAIL, ADMIN_PASSWORD, API_URL } from './helpers/fixtures.js';
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
    playwright,
  }) => {
    const { driver } = await requireActiveCloudBucket(playwright);

    await loginInBrowser(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/app\//);

    const api = page.context().request;
    const filename = `kunk-cloud-${Date.now()}.jpg`;
    const up = await uploadDocument(api, { filename, buffer: TINY_JPEG });
    expect(up.status, JSON.stringify(up.body)).toBe(201);
    expect(up.data?.id).toBeTruthy();
    expect(up.data.url).toBe(expectedFileUrl(up.data.id));
    expect(up.data.storage_driver).toBe(driver);
    expect(up.data.storage_key).toBeTruthy();

    const dl = await api.get(`${API_URL}/files/${up.data.id}/download`, {
      failOnStatusCode: false,
    });
    expect(dl.status()).toBe(200);
    const bytes = Buffer.from(await dl.body());
    expect(bytes.equals(TINY_JPEG)).toBe(true);

    await api.delete(`${API_URL}/files/${up.data.id}`, { failOnStatusCode: false });
  });
});
