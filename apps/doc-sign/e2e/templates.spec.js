import { test, expect } from '@playwright/test';
import { ensureAdminUser } from './helpers/db.js';
import { ADMIN_EMAIL, ADMIN_PASSWORD, appUrl } from './helpers/fixtures.js';
import { loginInBrowser } from './helpers/api.js';

test.describe('termos e modelos', () => {
  test.beforeAll(async () => {
    await ensureAdminUser();
  });

  test('lista termos', async ({ page }) => {
    await loginInBrowser(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(appUrl('/termos'));
    await expect(page.getByRole('heading', { name: 'Termos' })).toBeVisible();
  });

  test('lista modelos e abre editor self', async ({ page }) => {
    await loginInBrowser(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(appUrl('/modelos'));
    await expect(page.getByRole('heading', { name: /Modelos de termo/i })).toBeVisible();

    await page.goto(appUrl('/modelos/self'));
    await expect(page.getByRole('heading', { name: /Editar modelo/i })).toBeVisible({
      timeout: 20_000,
    });
  });
});
