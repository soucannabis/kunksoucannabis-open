import { test, expect } from '@playwright/test';
import { ensureAdminUser } from './helpers/db.js';
import { loginInBrowser } from './helpers/api.js';

/**
 * Substitui expectativas de stub ("Module under development") pelas páginas reais.
 */
test.describe('navigation', () => {
  test.beforeAll(async () => {
    await ensureAdminUser();
  });

  test.beforeEach(async ({ page }) => {
    await loginInBrowser(page);
    await expect(page.getByText('Kunk SouCannabis')).toBeVisible();
  });

  async function openSection(page, sectionLabel) {
    await page.getByTestId('kunk-sidebar').getByText(sectionLabel, { exact: true }).click();
  }

  test('navega Associados → associados', async ({ page }) => {
    await openSection(page, 'Acolhimento');
    await page.getByRole('menuitem', { name: 'Associados' }).click();
    await expect(page).toHaveURL(/\/app\/acolhimento\/associados/);
    await expect(page.getByPlaceholder(/Pesquisar/i)).toBeVisible({ timeout: 20_000 });
  });

  test('navega Triagem → fila', async ({ page }) => {
    await openSection(page, 'Acolhimento');
    await page.getByRole('menuitem', { name: 'Triagem' }).click();
    await expect(page).toHaveURL(/\/app\/acolhimento\/triagem/);
    await expect(page.getByRole('tab').first()).toBeVisible({ timeout: 20_000 });
  });

  test('navega Pedidos → listagem', async ({ page }) => {
    await openSection(page, 'Loja');
    await page.getByRole('menuitem', { name: 'Pedidos' }).click();
    await expect(page).toHaveURL(/\/app\/loja\/pedidos/);
    await expect(page.getByTestId('orders-page')).toBeVisible();
  });

  test('navega Atendimentos → listagem', async ({ page }) => {
    await openSection(page, 'Acolhimento');
    await page.getByRole('menuitem', { name: 'Atendimentos' }).click();
    await expect(page).toHaveURL(/\/app\/acolhimento\/servicos/);
    await expect(page.getByRole('button', { name: /Novo Atendimento/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('navega Produtos → listagem', async ({ page }) => {
    await openSection(page, 'Loja');
    await page.getByRole('menuitem', { name: 'Produtos' }).click();
    await expect(page).toHaveURL(/\/app\/loja\/produtos/);
    await expect(page.getByRole('button', { name: /Novo produto/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('QuickNav Pedidos funciona', async ({ page }) => {
    await page.getByRole('button', { name: 'Pedidos' }).click();
    await expect(page).toHaveURL(/\/app\/loja\/pedidos/);
  });
});
