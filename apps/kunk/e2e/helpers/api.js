import { ADMIN_EMAIL, ADMIN_PASSWORD } from './fixtures.js';

export async function loginInBrowser(page, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}
