'use strict';

const { query } = require('./pool');

let ensured = false;
let ensuring = null;

async function ensureUsersApiTokenPrefix() {
  if (ensured) return { created: false };
  if (ensuring) return ensuring;

  ensuring = (async () => {
    await query(`ALTER TABLE users_api ADD COLUMN IF NOT EXISTS token_prefix VARCHAR(32)`);
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_api_token_prefix_uidx
        ON users_api (token_prefix)
    `);
    ensured = true;
    return { created: true };
  })();

  try {
    return await ensuring;
  } finally {
    ensuring = null;
  }
}

function _resetEnsureFlag() {
  ensured = false;
}

module.exports = { ensureUsersApiTokenPrefix, _resetEnsureFlag };
