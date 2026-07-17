import { test, expect } from '@playwright/test';
import { ensureAdminUser } from './helpers/db.js';
import { ADMIN_EMAIL, ADMIN_PASSWORD, appUrl } from './helpers/fixtures.js';
import { loginInBrowser } from './helpers/api.js';

test.describe('arquivos', () => {
  test.beforeAll(async () => {
    await ensureAdminUser();
  });

  test('lista arquivos', async ({ page }) => {
    await loginInBrowser(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(appUrl('/arquivos'));
    await expect(page.getByRole('heading', { name: 'Arquivos' })).toBeVisible();
  });
});
