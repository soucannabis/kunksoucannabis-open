import { test, expect } from '@playwright/test';
import { ensureAdminUser } from './helpers/db.js';
import { loginInBrowser } from './helpers/api.js';

test.describe('shell', () => {
  test.beforeAll(async () => {
    await ensureAdminUser();
  });

  test('sidebar mostra seções mantidas e omite removidas', async ({ page }) => {
    await loginInBrowser(page);
    const sidebar = page.getByTestId('kunk-sidebar');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByText('Kunk SouCannabis')).toBeVisible();
    await expect(sidebar.getByText('Acolhimento', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('Loja', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('Profissionais', { exact: true }).first()).toBeVisible();

    await expect(sidebar.getByText('Dashboard', { exact: true })).toHaveCount(0);
    await expect(sidebar.getByText('Painel geral')).toHaveCount(0);
    await expect(sidebar.getByText('Beeviral Analytics')).toHaveCount(0);
    await expect(sidebar.getByText('Webmaster')).toHaveCount(0);
    await expect(sidebar.getByText('Nibo Dashboard')).toHaveCount(0);
    await expect(sidebar.getByText('Serviço Social')).toHaveCount(0);
    await expect(sidebar.getByText('Relatórios', { exact: true })).toHaveCount(0);
    await expect(sidebar.getByText('Usuários', { exact: true })).toHaveCount(0);
    await expect(sidebar.getByText('Usuários do sistema')).toHaveCount(0);
  });
});
