'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

function bool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parseCorsOrigin(value) {
  if (value === undefined || value === null || value === '') return true;
  if (value === 'true' || value === true) return true;
  const parts = String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return true;
  if (parts.length === 1) return parts[0];
  return parts;
}

const env = {
  port: Number(process.env.PORT || 8056),
  databaseUrl: process.env.DATABASE_URL || '',
  cookieSecure: bool(process.env.COOKIE_SECURE, process.env.NODE_ENV === 'production'),
  corsOrigin: parseCorsOrigin(process.env.CORS_ORIGIN),
  sessionMaxHours: Number(process.env.SESSION_MAX_HOURS || 168),
  storagePath: process.env.STORAGE_PATH || path.join(__dirname, '../../storage'),
  nodeEnv: process.env.NODE_ENV || 'development',
  termsDevBypass: bool(process.env.TERMS_DEV_BYPASS, false),
  /** Public base URL of doc-sign app (e.g. http://localhost:4258) for signing_url */
  docSignPublicUrl: String(process.env.DOC_SIGN_PUBLIC_URL || process.env.VITE_DOC_SIGN_URL || 'http://localhost:4258').replace(
    /\/$/,
    ''
  ),
  /** Master key for system_configs sensitive values (AES-256-GCM). Never stored in DB. */
  configEncryptKey: process.env.CONFIG_ENCRYPT_KEY || '',
  modules: {
    pagarme: bool(process.env.MODULE_PAGARME_ENABLED),
    soucannabis_orders: bool(process.env.MODULE_SOUCANNABIS_ORDERS_ENABLED),
    loggi: bool(process.env.MODULE_LOGGI_ENABLED),
    melhorenvio: bool(process.env.MODULE_MELHORENVIO_ENABLED),
    google_calendar: bool(process.env.MODULE_GOOGLE_CALENDAR_ENABLED),
    beeviral: bool(process.env.MODULE_BEEVIRAL_ENABLED),
    utalk: bool(process.env.MODULE_UTALK_ENABLED),
    pipefy: bool(process.env.MODULE_PIPEFY_ENABLED),
    brasilnfe: bool(process.env.MODULE_BRASILNFE_ENABLED),
    scp: bool(process.env.MODULE_SCP_ENABLED),
    nibo: bool(process.env.MODULE_NIBO_ENABLED),
    geoapify: bool(process.env.MODULE_GEOAPIFY_ENABLED),
    ciap2: bool(process.env.MODULE_CIAP2_ENABLED, true),
    email: bool(process.env.MODULE_EMAIL_ENABLED),
  },
  /** Public app URLs for e-mail links */
  publicUrls: {
    kunk: String(process.env.KUNK_PUBLIC_URL || process.env.PUBLIC_APP_URL || 'http://localhost:4255').replace(
      /\/$/,
      ''
    ),
    admin: String(process.env.ADMIN_PUBLIC_URL || 'http://localhost:4256').replace(/\/$/, ''),
    registration: String(
      process.env.REGISTRATION_PUBLIC_URL || process.env.CADASTRO_PUBLIC_URL || 'http://localhost:4257'
    ).replace(/\/$/, ''),
    docSign: String(process.env.DOC_SIGN_PUBLIC_URL || process.env.VITE_DOC_SIGN_URL || 'http://localhost:4258').replace(
      /\/$/,
      ''
    ),
  },
};

module.exports = { env };
