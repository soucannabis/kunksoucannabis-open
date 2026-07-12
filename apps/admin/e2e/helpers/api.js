import { API_URL, ADMIN_EMAIL, ADMIN_PASSWORD } from './fixtures.js';

export function createApi(request) {
  async function json(method, path, body) {
    const res = await request.fetch(`${API_URL}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
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

/** Login via browser context so session_token cookie is available to the page. */
export async function loginInBrowser(page, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}
