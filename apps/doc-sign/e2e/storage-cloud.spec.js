import { test, expect } from '@playwright/test';
import { prepareDocSignE2e } from './helpers/db.js';
import { ADMIN_EMAIL, ADMIN_PASSWORD, API_URL } from './helpers/fixtures.js';
import {
  requireActiveCloudBucket,
  uploadDocument,
  expectedFileUrl,
  TINY_JPEG,
} from './helpers/storageCloud.js';

test.describe('armazenamento cloud — bucket ativo', () => {
  test.beforeAll(async () => {
    await prepareDocSignE2e();
  });

  test('upload de arquivo (logo/termo) usa bucket e URL /files/:id/download', async ({
    request,
    playwright,
  }) => {
    const { driver } = await requireActiveCloudBucket(playwright);

    const login = await request.post(`${API_URL}/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      headers: { 'X-Kunk-App': 'doc-sign' },
      failOnStatusCode: false,
    });
    expect(login.status()).toBe(200);

    const filename = `doc-sign-cloud-${Date.now()}.jpg`;
    const up = await uploadDocument(request, { filename, buffer: TINY_JPEG });
    expect(up.status, JSON.stringify(up.body)).toBe(201);
    expect(up.data?.id).toBeTruthy();
    expect(up.data.url).toBe(expectedFileUrl(up.data.id));
    expect(up.data.storage_driver).toBe(driver);
    expect(up.data.storage_key).toBeTruthy();

    // Mesmo formato que o editor de modelo monta após upload
    const editorUrl = `/api/v1/files/${up.data.id}/download`;
    expect(editorUrl).toBe(expectedFileUrl(up.data.id));

    const dl = await request.get(`${API_URL}/files/${up.data.id}/download`, {
      failOnStatusCode: false,
    });
    expect(dl.status()).toBe(200);
    const bytes = Buffer.from(await dl.body());
    expect(bytes.equals(TINY_JPEG)).toBe(true);

    await request.delete(`${API_URL}/files/${up.data.id}`, { failOnStatusCode: false });
  });
});
