import { test, expect } from '@playwright/test';
import { ensureAdminUser } from '../helpers/db.js';
import { ADMIN_EMAIL, ADMIN_PASSWORD, appUrl } from '../helpers/fixtures.js';
import { loginInBrowser } from '../helpers/api.js';

test.describe('roadmap · termo detalhe', () => {
  test.beforeAll(async () => {
    await ensureAdminUser();
  });

  test('lista termos e tenta abrir detalhe se houver item', async ({ page }) => {
    await loginInBrowser(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(appUrl('/termos'));
    await expect(page.getByRole('heading', { name: 'Termos' })).toBeVisible();
    const link = page.locator('a[href*="/termos/"]').first();
    if (await link.count()) {
      await link.click();
      await expect(page).toHaveURL(/\/termos\//);
    }
  });
});
