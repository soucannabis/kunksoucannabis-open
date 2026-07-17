import { test } from '@playwright/test';
import { API_URL, ADMIN_EMAIL, ADMIN_PASSWORD } from './fixtures.js';

/** JPEG mínimo válido para multipart. */
export const TINY_JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

/**
 * Confirma bucket S3/GCS ativo via API admin (contexto isolado).
 * Faz `test.skip` se o driver for local ou se o login falhar.
 */
export async function requireActiveCloudBucket(playwright, {
  apiUrl = API_URL,
  email = ADMIN_EMAIL,
  password = ADMIN_PASSWORD,
} = {}) {
  const ctx = await playwright.request.newContext();
  try {
    const login = await ctx.post(`${apiUrl}/auth/login`, {
      data: { email, password },
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

export async function uploadDocument(request, {
  apiUrl = API_URL,
  filename = 'e2e-cloud-doc.jpg',
  mimeType = 'image/jpeg',
  buffer = TINY_JPEG,
} = {}) {
  const res = await request.post(`${apiUrl}/files`, {
    multipart: {
      file: { name: filename, mimeType, buffer },
      filename,
    },
    failOnStatusCode: false,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status(), data: body.data, body };
}
