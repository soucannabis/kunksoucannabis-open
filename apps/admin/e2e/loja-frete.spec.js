import { test, expect } from '@playwright/test';
import { ensureAdminUser } from './helpers/db.js';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers/fixtures.js';
import { loginInBrowser } from './helpers/api.js';

test.describe('loja frete', () => {
  test.beforeAll(async () => {
    await ensureAdminUser();
  });

  test('campos obrigatórios e apply_to_total', async ({ page }) => {
    await loginInBrowser(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page.getByText('Kunk Admin')).toBeVisible();
    await page.goto('/loja/frete');
    await expect(page.getByRole('heading', { name: 'Frete da loja' })).toBeVisible();

    const apply = page.getByTestId('apply-to-total');
    await expect(apply).toBeVisible();
    if (!(await apply.isChecked())) {
      await apply.check();
    }

    // Clear required fields to force incomplete banner, then fill
    await page.getByTestId('ship-from-street').fill('');
    await page.getByTestId('content-description').fill('');
    await expect(page.getByTestId('freight-incomplete-banner')).toBeVisible();

    await page.getByTestId('ship-from-street').fill('Rua Teste');
    await page.getByTestId('ship-from-number').fill('100');
    await page.getByTestId('ship-from-city').fill('Goiânia');
    await page.getByTestId('ship-from-state').fill('GO');
    await page.getByTestId('ship-from-cep').fill('74000000');

    await page.getByTestId('package-weight_g').fill('500');
    await page.getByTestId('package-length_cm').fill('16');
    await page.getByTestId('package-width_cm').fill('11');
    await page.getByTestId('package-height_cm').fill('7');

    await page.getByTestId('content-description').fill('Produto terapêutico');
    await page.getByTestId('content-total-value').fill('100');

    await page.getByTestId('save-freight').click();
    await expect(page.getByTestId('freight-incomplete-banner')).toHaveCount(0, { timeout: 10000 });
  });
});
