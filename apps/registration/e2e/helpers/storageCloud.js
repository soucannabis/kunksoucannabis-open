import { test } from '@playwright/test';

/** JPEG mínimo válido para multipart. */
export const TINY_JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@kunk-api.test';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'TestAdmin123!';

/**
 * Confirma bucket S3/GCS ativo via API admin (contexto isolado).
 * Faz `test.skip` se o driver for local ou se o login falhar.
 */
export async function requireActiveCloudBucket(playwright, apiUrl) {
  const ctx = await playwright.request.newContext();
  try {
    const login = await ctx.post(`${apiUrl}/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      headers: { 'X-Kunk-App': 'admin' },
      failOnStatusCode: false,
    });
    if (login.status() !== 200) {
      test.skip(true, `Login admin falhou (${login.status()}) — não dá para checar bucket`);
    }
    const res = await ctx.get(`${apiUrl}/admin/storage`, { failOnStatusCode: false });
    const body = await res.json().catch(() => ({}));
    const driver = String(body.data?.driver || '').toLowerCase();
    if (driver !== 's3' && driver !== 'gcs') {
      test.skip(true, `Bucket cloud não ativo (driver=${driver || 'unknown'})`);
    }
    return { driver, status: body.data };
  } finally {
    await ctx.dispose();
  }
}

export function expectedFileUrl(id) {
  return `/api/v1/files/${id}/download`;
}
