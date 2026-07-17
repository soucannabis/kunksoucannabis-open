import { test, expect } from '@playwright/test';
import { ensureAdminUser } from './helpers/db.js';
import { ADMIN_EMAIL, ADMIN_PASSWORD, appUrl } from './helpers/fixtures.js';
import { loginInBrowser } from './helpers/api.js';

test.describe('configs', () => {
  test.beforeAll(async () => {
    await ensureAdminUser();
  });

  test('lista systems e edita key registration', async ({ page }) => {
    await loginInBrowser(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.getByRole('link', { name: 'Variáveis' }).click();
    await expect(page.getByRole('heading', { name: 'Variáveis' })).toBeVisible();

    const regLink = page.getByRole('link', { name: /Cadastramento|registration/i });
    if (await regLink.count() === 0) {
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
      await page.goto(appUrl('/configs'));
    }

    await page.getByRole('link', { name: /Cadastramento|registration/i }).first().click();
    await expect(
      page.getByRole('heading', { name: /Variáveis · (registration|Cadastramento)/ })
    ).toBeVisible();

    const keyCard = page.locator('.configs-key-card', { hasText: 'VITE_ASSOCIATION_NAME' }).first();
    if (await keyCard.count()) {
      const input = keyCard.locator('input').first();
      await input.fill(`Assoc E2E ${Date.now()}`);
      await keyCard.getByRole('button', { name: 'Salvar' }).click();
      await expect(page.getByText(/Salvo:/)).toBeVisible();
      await keyCard.getByRole('button', { name: 'Limpar' }).click();
      await expect(page.getByText(/Limpo:/)).toBeVisible();
    }
  });
});
