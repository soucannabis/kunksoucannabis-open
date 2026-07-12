'use strict';

const credentialsService = require('../credentialsService');
const { AppError } = require('../../utils/response');
const { query } = require('../../db/pool');

async function getMeCredentials(required = ['client_id', 'client_secret']) {
  return credentialsService.requireFields('melhorenvio', required);
}

async function getApiBase() {
  const all = await credentialsService.resolveAll('melhorenvio');
  return (
    all.api_base_url ||
    process.env.MELHOR_ENVIO_API_URL ||
    'https://www.melhorenvio.com.br/api/v2'
  ).replace(/\/$/, '');
}

async function getTokens() {
  const all = await credentialsService.resolveAll('melhorenvio');
  return {
    access_token: all.access_token || null,
    refresh_token: all.refresh_token || null,
    client_id: all.client_id,
    client_secret: all.client_secret,
    redirect_uri: all.redirect_uri,
  };
}

async function saveTokens({ access_token, refresh_token }) {
  const now = new Date().toISOString();
  if (access_token) {
    const enc = credentialsService.encryptValue(access_token);
    await query(
      `UPDATE system_api_credentials
       SET encrypted_value = $1, date_updated = $2
       WHERE service = 'melhorenvio' AND field_key = 'access_token'`,
      [enc, now]
    );
  }
  if (refresh_token) {
    const enc = credentialsService.encryptValue(refresh_token);
    await query(
      `UPDATE system_api_credentials
       SET encrypted_value = $1, date_updated = $2
       WHERE service = 'melhorenvio' AND field_key = 'refresh_token'`,
      [enc, now]
    );
  }
}

async function buildAuthorizeUrl() {
  const clientId = (await credentialsService.resolveField('melhorenvio', 'client_id')).value;
  const redirect = (await credentialsService.resolveField('melhorenvio', 'redirect_uri')).value;
  if (!clientId || !redirect) {
    throw new AppError(400, 'CREDENTIAL_MISSING', 'client_id/redirect_uri Melhor Envio ausentes');
  }
  const base = await getApiBase();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: 'code',
    scope:
      'cart-read cart-write companies-read shipping-calculate shipping-companies shipping-generate shipping-preview shipping-print shipping-tracking shipping-cancel users-read',
  });
  return `${base.replace('/api/v2', '')}/oauth/authorize?${params}`;
}

async function exchangeCode(code) {
  const clientId = (await credentialsService.resolveField('melhorenvio', 'client_id')).value;
  const clientSecret = (await credentialsService.resolveField('melhorenvio', 'client_secret')).value;
  const redirect = (await credentialsService.resolveField('melhorenvio', 'redirect_uri')).value;
  if (!clientId || !clientSecret || !redirect) {
    throw new AppError(400, 'CREDENTIAL_MISSING', 'Credenciais OAuth Melhor Envio incompletas');
  }
  const base = await getApiBase();
  const res = await fetch(`${base}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirect,
      code,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new AppError(400, 'CREDENTIAL_INVALID', `OAuth Melhor Envio falhou (${res.status})`, {
      body: text,
    });
  }
  const data = await res.json();
  await saveTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
  return { ok: true };
}

async function refreshAccessToken() {
  const tokens = await getTokens();
  if (!tokens.refresh_token || !tokens.client_id || !tokens.client_secret) {
    throw new AppError(400, 'CREDENTIAL_MISSING', 'refresh_token Melhor Envio ausente');
  }
  const base = await getApiBase();
  const res = await fetch(`${base}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: tokens.client_id,
      client_secret: tokens.client_secret,
      refresh_token: tokens.refresh_token,
    }),
  });
  if (!res.ok) {
    throw new AppError(400, 'CREDENTIAL_INVALID', 'Falha ao renovar token Melhor Envio');
  }
  const data = await res.json();
  await saveTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token || tokens.refresh_token,
  });
  return data.access_token;
}

async function getAccessToken() {
  const tokens = await getTokens();
  if (tokens.access_token) return tokens.access_token;
  throw new AppError(400, 'CREDENTIAL_MISSING', 'access_token Melhor Envio ausente — faça OAuth');
}

async function meRequest(path, body = null, method = 'GET') {
  const base = await getApiBase();
  let token = await getAccessToken();
  const doFetch = async (t) =>
    fetch(`${base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${t}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body != null ? JSON.stringify(body) : undefined,
    });

  let res = await doFetch(token);
  if (res.status === 401) {
    token = await refreshAccessToken();
    res = await doFetch(token);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new AppError(502, 'INTERNAL_ERROR', `Melhor Envio HTTP ${res.status}`, { body: text });
  }
  if (res.status === 204) return null;
  return res.json();
}

async function oauthStatus() {
  const tokens = await getTokens();
  return {
    authenticated: Boolean(tokens.access_token),
    has_refresh: Boolean(tokens.refresh_token),
  };
}

async function testConnection(creds) {
  if (!creds.client_id || !creds.client_secret) {
    throw new Error('client_id e client_secret são obrigatórios');
  }
  // Soft test: credentials present; full OAuth may still be needed
  return { ok: true, note: 'client credentials presentes; OAuth pode ser necessário para quote' };
}

module.exports = {
  getMeCredentials,
  getApiBase,
  getTokens,
  saveTokens,
  buildAuthorizeUrl,
  exchangeCode,
  meRequest,
  oauthStatus,
  testConnection,
  getAccessToken,
};
