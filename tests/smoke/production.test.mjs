'use strict';

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

const API_URL = (process.env.E2E_API_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@kunk-api.test';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'TestAdmin123!';

const FRONTEND_URLS = {
  admin: process.env.ADMIN_URL || 'https://admin-production-f8cd.up.railway.app',
  kunk: process.env.KUNK_URL || 'https://kunk-app-production-3ade.up.railway.app',
  registration: process.env.REGISTRATION_URL || 'https://registration-production-8bd4.up.railway.app',
  'doc-sign': process.env.DOC_SIGN_URL || 'https://doc-sign-production-353f.up.railway.app',
};

async function jsonFetch(method, path, { body, headers = {} } = {}) {
  const url = `${API_URL}${path}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, headers: Object.fromEntries(res.headers) };
}

let sessionCookie;

describe('API Smoke Tests', () => {
  test('GET /health retorna 200 e ok: true', async () => {
    const { status, data } = await jsonFetch('GET', '/health');
    assert.equal(status, 200);
    assert.equal(data.data?.ok, true);
    assert.equal(data.errors, null);
  });

  test('POST /auth/login (admin) retorna 200 e usuario', async () => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Kunk-App': 'admin' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
      redirect: 'manual',
    });
    assert.equal(res.status, 200, `Login falhou: ${res.status}`);
    const body = await res.json();
    assert.ok(body.data?.user?.email, 'Resposta deve conter user.email');

    const setCookie = res.headers.getSetCookie?.() || [];
    sessionCookie = setCookie.map((c) => c.split(';')[0]).join('; ');
  });

  test('GET /auth/me com sessao retorna usuario', async () => {
    if (!sessionCookie) return;
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { 'X-Kunk-App': 'admin', Cookie: sessionCookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data?.user?.email);
  });

  test('GET /items/products (autenticado) retorna 200', async () => {
    if (!sessionCookie) return;
    const res = await fetch(`${API_URL}/items/products?limit=1`, {
      headers: { 'X-Kunk-App': 'admin', Cookie: sessionCookie },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data), 'data deve ser array');
  });

  test('GET /items/orders (autenticado) retorna 200', async () => {
    if (!sessionCookie) return;
    const res = await fetch(`${API_URL}/items/orders?limit=1`, {
      headers: { 'X-Kunk-App': 'admin', Cookie: sessionCookie },
    });
    assert.equal(res.status, 200);
  });

  test('GET /items/products sem sessao retorna 401', async () => {
    const { status } = await jsonFetch('GET', '/items/products', {
      headers: { 'X-Kunk-App': 'admin' },
    });
    assert.equal(status, 401);
  });

  test('POST /auth/logout encerra sessao', async () => {
    if (!sessionCookie) return;
    const res = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'X-Kunk-App': 'admin', Cookie: sessionCookie },
    });
    assert.ok([200, 204].includes(res.status));
    sessionCookie = null;
  });
});

describe('Frontend Health Checks', () => {
  for (const [name, url] of Object.entries(FRONTEND_URLS)) {
    test(`${name} /health retorna 200`, async () => {
      const res = await fetch(`${url}/health`, { redirect: 'follow' });
      assert.equal(res.status, 200, `${name} health falhou: ${res.status}`);
    });
  }
});
