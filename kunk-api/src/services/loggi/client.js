'use strict';

const credentialsService = require('../credentialsService');
const { AppError } = require('../../utils/response');

let cachedToken = null;
let cachedTokenExp = 0;

async function getLoggiCredentials() {
  return credentialsService.requireFields('loggi', ['client_id', 'client_secret', 'company_id']);
}

async function getApiBase() {
  const all = await credentialsService.resolveAll('loggi');
  return (all.api_base_url || process.env.LOGGI_URL_API || 'https://api.loggi.com/v1').replace(/\/$/, '');
}

async function getTokenUrl() {
  const all = await credentialsService.resolveAll('loggi');
  return all.token_url || process.env.LOGGI_TOKEN_URL || 'https://api.loggi.com/v2/oauth2/token';
}

async function obtainToken(creds) {
  const now = Date.now();
  if (cachedToken && cachedTokenExp > now + 30_000) return cachedToken;

  const tokenUrl = await getTokenUrl();
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: creds.client_id,
      client_secret: creds.client_secret,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new AppError(400, 'CREDENTIAL_INVALID', `Falha OAuth Loggi (${res.status})`, { body: text });
  }
  const data = await res.json();
  const token = data.idToken || data.access_token || data.token;
  if (!token) {
    throw new AppError(400, 'CREDENTIAL_INVALID', 'Token Loggi ausente na resposta');
  }
  cachedToken = token;
  cachedTokenExp = now + (Number(data.expires_in) || 3500) * 1000;
  return token;
}

async function loggiRequest(path, body = null, method = 'GET', credsOverride = null) {
  const creds = credsOverride || (await getLoggiCredentials());
  const token = await obtainToken(creds);
  const base = await getApiBase();
  const url = `${base}/companies/${creds.company_id}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new AppError(502, 'INTERNAL_ERROR', `Loggi HTTP ${res.status}`, { body: text });
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

async function testConnection(creds) {
  await obtainToken(creds);
  cachedToken = null;
  return { ok: true };
}

function clearTokenCache() {
  cachedToken = null;
  cachedTokenExp = 0;
}

module.exports = {
  getLoggiCredentials,
  loggiRequest,
  obtainToken,
  testConnection,
  clearTokenCache,
  getApiBase,
};
