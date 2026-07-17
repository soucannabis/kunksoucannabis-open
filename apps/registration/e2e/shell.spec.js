import { test, expect } from '@playwright/test';

/**
 * Smoke leve — o funil completo já está em auth/guards/funnel/documents/phase5.
 */
test.describe('shell público', () => {
  test('visitante em / vai para login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('página de login carrega', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  });
});
