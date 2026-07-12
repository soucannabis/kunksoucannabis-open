import { test, expect } from '@playwright/test';
import { ensureAdminUser } from './helpers/db.js';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers/fixtures.js';
import { loginInBrowser } from './helpers/api.js';

test.describe('dados', () => {
  test.beforeAll(async () => {
    await ensureAdminUser();
  });

  test('CRUD leve em etiquetas', async ({ page }) => {
    await loginInBrowser(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page.getByRole('heading', { name: 'Dados' })).toBeVisible();
    await page.getByRole('link', { name: 'Etiquetas' }).click();
    await expect(page.getByRole('heading', { name: 'Etiquetas' })).toBeVisible();

    await page.getByRole('button', { name: 'Configurar campos visíveis' }).click();
    await expect(page.getByRole('heading', { name: 'Campos visíveis' })).toBeVisible();
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByRole('heading', { name: 'Campos visíveis' })).toHaveCount(0);

    await page.getByRole('link', { name: 'Novo registro' }).click();
    const tagName = `e2e-${Date.now()}`;
    await page.getByLabel('Etiqueta').fill(tagName);
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page).toHaveURL(/\/dados\/tags\/\d+/);
    await expect(page.getByLabel('Etiqueta')).toHaveValue(tagName);

    await page.getByLabel('Etiqueta').fill(`${tagName}-edit`);
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Salvo.')).toBeVisible();

    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Excluir' }).click();
    await expect(page).toHaveURL(/\/dados\/tags$/);

    await page.getByRole('link', { name: 'Configs' }).click();
    await page.getByRole('link', { name: /Admin/i }).click();
    await expect(page.getByRole('heading', { name: 'Campos visíveis em Dados' })).toBeVisible();
    await expect(page.getByText('Etiquetas')).toBeVisible();
  });
});
