'use strict';

const { query } = require('../db/pool');
const { env } = require('../config/env');

function asBool(v, fallback = false) {
  if (v === undefined || v === null || v === '') return fallback;
  if (typeof v === 'boolean') return v;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

/**
 * Resolve whether a module is enabled.
 * Precedence: Admin (`system_configs` modules.{name}.enabled) always overrides env.
 * If there is no admin value, fall back to MODULE_*_ENABLED.
 */
async function isModuleEnabled(name) {
  const key = `modules.${name}.enabled`;
  const result = await query(
    `SELECT value FROM system_configs WHERE system = 'modules' AND key = $1 LIMIT 1`,
    [key]
  );
  let enabled = false;
  if (result.rows[0] && result.rows[0].value != null && result.rows[0].value !== '') {
    enabled = asBool(result.rows[0].value, false);
  } else {
    enabled = env.modules[name] === true;
  }
  if (!enabled) return false;

  // Pagar.me só fica efetivamente ativo com Secret key + webhooks validados.
  if (name === 'pagarme') {
    try {
      const credentialsService = require('./credentialsService');
      const hooksSetup = require('./pagarme/hooksSetup');
      const creds = await credentialsService.listPublic('pagarme');
      const hasSecret = Boolean(creds.find((c) => c.field_key === 'secret_key')?.has_value);
      if (!hasSecret) return false;
      const webhooks = await hooksSetup.getWebhooksStatus();
      if (!webhooks?.ready) return false;
    } catch {
      return false;
    }
  }
  return true;
}

/** Sync peek of env default only (no DB). Prefer isModuleEnabled for runtime gates. */
function envModuleDefault(name) {
  return env.modules[name] === true;
}

module.exports = {
  asBool,
  isModuleEnabled,
  envModuleDefault,
};
