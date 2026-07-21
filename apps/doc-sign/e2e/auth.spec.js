import { test, expect } from '@playwright/test';
import { ensureAdminUser } from './helpers/db.js';
import { ADMIN_EMAIL, ADMIN_PASSWORD, appUrl } from './helpers/fixtures.js';
import { loginInBrowser } from './helpers/api.js';

test.describe('auth', () => {
  test.beforeAll(async () => {
    await ensureAdminUser();
  });

  test('login com Administrador entra em Termos', async ({ page }) => {
    await loginInBrowser(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/termos/);
    await expect(page.getByText('ASSINATURA DE TERMOS')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Termos' })).toBeVisible();
  });

  test('credencial inválida mostra erro', async ({ page }) => {
    await page.goto(appUrl('/login'));
    await page.getByLabel('E-mail').fill(ADMIN_EMAIL);
    await page.getByLabel('Senha').fill('wrong-password');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.locator('.alert-error')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('logout volta para login', async ({ page }) => {
    await loginInBrowser(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page.getByText('ASSINATURA DE TERMOS')).toBeVisible();
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
