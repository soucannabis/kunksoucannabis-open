import { test, expect } from '@playwright/test';
import { ensureAdminUser } from './helpers/db.js';
import { loginInBrowser } from './helpers/api.js';

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

  test('navega Associados → cadastramento stub', async ({ page }) => {
    await openSection(page, 'Acolhimento');
    await page.getByRole('menuitem', { name: 'Associados' }).click();
    await expect(page).toHaveURL(/\/app\/acolhimento\/cadastramento/);
    await expect(page.getByText('Module under development')).toBeVisible();
  });

  test('navega Triagem → triagem stub', async ({ page }) => {
    await openSection(page, 'Acolhimento');
    await page.getByRole('menuitem', { name: 'Triagem' }).click();
    await expect(page).toHaveURL(/\/app\/acolhimento\/triagem/);
    await expect(page.getByText('Module under development')).toBeVisible();
  });

  test('navega Pedidos → listagem', async ({ page }) => {
    await openSection(page, 'Loja');
    await page.getByRole('menuitem', { name: 'Pedidos' }).click();
    await expect(page).toHaveURL(/\/app\/loja\/pedidos/);
    await expect(page.getByTestId('orders-page')).toBeVisible();
  });

  test('navega Serviços → servicos stub', async ({ page }) => {
    await openSection(page, 'Acolhimento');
    await page.getByRole('menuitem', { name: 'Serviços' }).click();
    await expect(page).toHaveURL(/\/app\/acolhimento\/servicos/);
    await expect(page.getByText('Module under development')).toBeVisible();
  });

  test('QuickNav Pedidos funciona', async ({ page }) => {
    await page.getByRole('button', { name: 'Pedidos' }).click();
    await expect(page).toHaveURL(/\/app\/loja\/pedidos/);
  });
});
