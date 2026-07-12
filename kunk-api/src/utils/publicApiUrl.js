'use strict';

const { env } = require('../config/env');

/** Hosts Docker / rede interna — nunca usar em redirect OAuth público. */
function isInternalHostname(host) {
  const hostname = String(host || '')
    .split(':')[0]
    .trim()
    .toLowerCase();
  if (!hostname) return true;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return false;
  // IP literal (Google OAuth também rejeita, mas não é nome de serviço)
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return false;
  // Nome com domínio (ex.: api.exemplo.com, xxx.ngrok-free.app)
  if (hostname.includes('.')) return false;
  // Nome simples sem ponto → DNS interno Docker (kunk-api, admin, …)
  return true;
}

/**
 * Public base URL of the API (no trailing slash).
 * Prefer PUBLIC_API_URL. Never use Docker service names like kunk-api.
 */
function publicApiBase(req) {
  const fromEnv = String(process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || '')
    .trim()
    .replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  const port = env.port || Number(process.env.PORT) || 8056;
  const localhostDefault = `http://localhost:${port}`;

  if (req) {
    const proto = String(req.get('x-forwarded-proto') || req.protocol || 'http')
      .split(',')[0]
      .trim();
    // Prefer forwarded host from the browser (admin), then Host.
    const candidates = [
      req.get('x-forwarded-host'),
      req.get('x-original-host'),
      req.get('host'),
    ];
    for (const raw of candidates) {
      const host = String(raw || '')
        .split(',')[0]
        .trim();
      if (!host || isInternalHostname(host)) continue;
      // Se o host for o front (ex. localhost:4256), ainda preferimos a porta da API.
      const hostname = host.split(':')[0].toLowerCase();
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return localhostDefault;
      }
      return `${proto}://${host}`.replace(/\/$/, '');
    }
  }

  return localhostDefault;
}

/** OAuth callback: /api/v1/modules/:service/oauth/callback */
function oauthRedirectUri(service, req) {
  return `${publicApiBase(req)}/api/v1/modules/${service}/oauth/callback`;
}

module.exports = { publicApiBase, oauthRedirectUri, isInternalHostname };
