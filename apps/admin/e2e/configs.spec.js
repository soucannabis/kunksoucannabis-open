import { test, expect } from '@playwright/test';
import { ensureAdminUser } from './helpers/db.js';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers/fixtures.js';
import { loginInBrowser } from './helpers/api.js';

test.describe('configs', () => {
  test.beforeAll(async () => {
    await ensureAdminUser();
  });

  test('lista systems e edita key registration', async ({ page }) => {
    await loginInBrowser(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.getByRole('link', { name: 'Configs' }).click();
    await expect(page.getByRole('heading', { name: 'System configs' })).toBeVisible();

    // Ensure registration system exists via create if empty
    const regLink = page.getByRole('link', { name: /registration/i });
    if (await regLink.count() === 0) {
      // create via API from page context
      await page.evaluate(async () => {
        await fetch('/api/v1/config', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system: 'registration',
            key: 'VITE_ASSOCIATION_NAME',
            value: 'E2E Assoc',
          }),
        });
      });
      await page.reload();
    }

    await page.getByRole('link', { name: /registration/i }).first().click();
    await expect(page.getByRole('heading', { name: /Configs · (registration|Cadastramento)/ })).toBeVisible();

    const keyRow = page.locator('tr', { hasText: 'VITE_ASSOCIATION_NAME' }).first();
    if (await keyRow.count()) {
      const input = keyRow.locator('input').first();
      await input.fill(`Assoc E2E ${Date.now()}`);
      await keyRow.getByRole('button', { name: 'Salvar' }).click();
      await expect(page.getByText(/Salvo:/)).toBeVisible();
      await keyRow.getByRole('button', { name: 'Clear' }).click();
      await expect(page.getByText(/Limpo:/)).toBeVisible();
    }
  });
});
