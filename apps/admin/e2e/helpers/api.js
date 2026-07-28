import { API_URL, ADMIN_EMAIL, ADMIN_PASSWORD, appUrl } from './fixtures.js';

export function createApi(request) {
  async function json(method, path, body) {
    const headers = { 'X-Kunk-App': 'admin' };
    if (body) headers['Content-Type'] = 'application/json';
    const res = await request.fetch(`${API_URL}${path}`, {
      method,
      headers,
      data: body ? JSON.stringify(body) : undefined,
      failOnStatusCode: false,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status(), body: data, headers: res.headers() };
  }

  return {
    json,
    login: (email, password) => json('POST', '/auth/login', { email, password }),
    logout: () => json('POST', '/auth/logout', {}),
    me: () => json('GET', '/auth/me'),
  };
}

/** Login via browser context so app-scoped session cookie is available to the page. */
export async function loginInBrowser(page, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  await page.goto(appUrl('/login'));
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

/** Fecha prompts de onboarding do Admin (armazenamento) se aparecerem. */
export async function dismissAdminPrompts(page) {
  // Modal de e-mail só tem "Configurar" — e2e que precisa passar deve ativar o módulo
  // ou navegar direto para /servicos-externos/email.
  const storageDialog = page.getByRole('dialog', { name: 'Configurar armazenamento' });
  await storageDialog.getByRole('button', { name: 'Não' }).click({ timeout: 8000 }).catch(() => {});
}
