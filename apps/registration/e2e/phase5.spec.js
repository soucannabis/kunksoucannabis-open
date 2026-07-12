import { test, expect } from '@playwright/test';
import { uniqueEmail } from './helpers/fixtures.js';
import { seedAssociate } from './helpers/api.js';

test.describe('Fase 5 — consulta e conclusão', () => {
  test('consulta → concluir → cadastro-concluido', async ({ page }) => {
    const email = uniqueEmail('fase5');
    const { user } = await seedAssociate(page, { email, phase: 5 });
    expect(user?.associate_status).toBe(5);

    await page.goto('/consulta');
    await expect(page.getByRole('heading', { name: /Consulta e documentos extras/i })).toBeVisible();

    await page.locator('textarea').fill('Receita de teste E2E');
    await page.getByRole('button', { name: /Concluir cadastro/i }).click();
    await expect(page).toHaveURL(/\/cadastro-concluido/, { timeout: 20_000 });
    await expect(page.getByText(/Cadastro concluído/i)).toBeVisible();
    await expect(page.getByText(/Associado/)).toBeVisible();
  });

  test('home redirects Associado to concluido', async ({ page }) => {
    const email = uniqueEmail('done');
    const { api } = await seedAssociate(page, { email, phase: 5 });
    await api.complete();
    await page.goto('/');
    await expect(page).toHaveURL(/\/cadastro-concluido/);
  });
});
