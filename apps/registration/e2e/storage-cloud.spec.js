import { test, expect } from '@playwright/test';
import { uniqueEmail, API_URL } from './helpers/fixtures.js';
import { createApi, seedAssociate } from './helpers/api.js';
import {
  requireActiveCloudBucket,
  expectedFileUrl,
  TINY_JPEG,
} from './helpers/storageCloud.js';

test.describe('armazenamento cloud — bucket ativo', () => {
  test('upload de documento (CNH) usa bucket e URL /files/:id/download', async ({
    page,
    playwright,
  }) => {
    const { driver } = await requireActiveCloudBucket(playwright, API_URL);

    const email = uniqueEmail('cloud-docs');
    await seedAssociate(page, { email, phase: 3 });
    const api = createApi(page.context().request);

    const up = await api.uploadIdentity({
      docType: 'cnh',
      side: 'front',
      subject: 'responsible',
    });
    expect(up.status, JSON.stringify(up.data)).toBe(201);
    const file = up.data?.data;
    expect(file?.id).toBeTruthy();
    expect(file.url).toBe(expectedFileUrl(file.id));
    expect(file.storage_driver).toBe(driver);
    expect(file.storage_key).toBeTruthy();

    const dl = await page.context().request.get(`${API_URL}/files/${file.id}/download`, {
      failOnStatusCode: false,
    });
    expect(dl.status()).toBe(200);
    const bytes = Buffer.from(await dl.body());
    expect(bytes.equals(TINY_JPEG)).toBe(true);
  });
});
