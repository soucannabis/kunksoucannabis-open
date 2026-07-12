import { test, expect } from '@playwright/test';
import { ensurePartnerUser } from './helpers/db.js';
import { PARTNER_EMAIL, PARTNER_PASSWORD } from './helpers/fixtures.js';
import { loginInBrowser } from './helpers/api.js';

test.describe('guards', () => {
  test('sem sessão redireciona para login', async ({ page }) => {
    await page.goto('/app/store/orders');
    await expect(page).toHaveURL(/\/login/);
  });

  test('papel sem permissão vai para unauthorized', async ({ page }) => {
    await ensurePartnerUser();
    await loginInBrowser(page, PARTNER_EMAIL, PARTNER_PASSWORD);
    await expect(page).toHaveURL(/\/unauthorized/);
  });
});
