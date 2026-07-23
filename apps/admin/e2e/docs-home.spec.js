import { test, expect } from '@playwright/test';
import { ensureAdminUser } from './helpers/db.js';
import { ADMIN_EMAIL, ADMIN_PASSWORD, appUrl } from './helpers/fixtures.js';
import { loginInBrowser } from './helpers/api.js';

test.describe('central de ajuda (documentação)', () => {
  test.beforeAll(async () => {
    await ensureAdminUser();
  });

  test('menu Documentação abre a central de ajuda', async ({ page }) => {
    await loginInBrowser(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/home\/?$/);
    await page.locator('.admin-nav').getByRole('link', { name: 'Documentação', exact: true }).click();
    await expect(page).toHaveURL(/\/inicio\/?$/);
    await expect(page.getByTestId('admin-docs-home')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Central de ajuda', exact: true })).toBeVisible();
  });

  test('pesquisa encontra artigo e Abrir no Admin navega', async ({ page }) => {
    await loginInBrowser(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto(appUrl('/inicio'));
    await expect(page.getByTestId('admin-docs-home')).toBeVisible();

    const storageNo = page.getByRole('button', { name: 'Não', exact: true });
    await storageNo.click({ timeout: 3000 }).catch(() => {});

    await page.getByTestId('admin-docs-search').fill('loggi');
    const navLoggi = page.getByTestId('admin-docs-nav-servicos-loggi');
    await expect(navLoggi).toBeVisible();
    await navLoggi.click();
    await expect(page).toHaveURL(/\/inicio\/servicos-loggi/);
    await page.getByTestId('admin-docs-search').fill('');
    await expect(page.getByTestId('admin-docs-article').getByRole('heading', { name: 'Loggi' })).toBeVisible();

    await page.getByTestId('admin-docs-open-page').click({ force: true });
    await expect(page).toHaveURL(/\/servicos-externos\/loggi/);
  });

  test('menu Documentação a partir de outra página', async ({ page }) => {
    await loginInBrowser(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.locator('.admin-nav').getByRole('link', { name: 'Arquivos', exact: true }).click();
    await expect(page).toHaveURL(/\/arquivos/);
    await page.locator('.admin-nav').getByRole('link', { name: 'Documentação', exact: true }).click();
    await expect(page).toHaveURL(/\/inicio\/?$/);
    await expect(page.getByTestId('admin-docs-home')).toBeVisible();
  });
});
