import { test, expect } from '@playwright/test';
import { ensureAdminUser } from './helpers/db.js';
import { ADMIN_EMAIL, ADMIN_PASSWORD, appUrl } from './helpers/fixtures.js';
import { loginInBrowser } from './helpers/api.js';

test.describe('loja status pedidos', () => {
  test.beforeAll(async () => {
    await ensureAdminUser();
  });

  test('abre status e salva', async ({ page }) => {
    await loginInBrowser(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(appUrl('/loja/status-pedidos'));
    await expect(page.getByTestId('order-statuses-form')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Status de pedidos' })).toBeVisible();
    await page.getByTestId('save-order-statuses').click();
    await expect(page.getByTestId('save-order-statuses')).toBeEnabled({ timeout: 10000 });
  });
});
