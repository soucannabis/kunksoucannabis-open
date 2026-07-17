'use strict';

const { query } = require('../db/pool');
const { env } = require('../config/env');
const credentialsService = require('../services/credentialsService');
const { AppError } = require('../utils/response');

const DRIVERS = new Set(['local', 's3', 'gcs']);

function asBool(v, fallback = false) {
  if (v === undefined || v === null || v === '') return fallback;
  if (typeof v === 'boolean') return v;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

function readEnv(key) {
  const raw = process.env[key];
  if (raw === undefined || raw === null || raw === '') return null;
  return String(raw);
}

async function loadStorageConfigRows() {
  const result = await query(
    `SELECT key, value FROM system_configs WHERE system = 'storage'`
  );
  const map = {};
  for (const row of result.rows) {
    map[row.key] = row.value != null && row.value !== '' ? String(row.value) : null;
  }
  return map;
}

function pick(dbVal, envKey, hardcoded = '') {
  if (dbVal != null && dbVal !== '') return { value: dbVal, source: 'db' };
  const fromEnv = envKey ? readEnv(envKey) : null;
  if (fromEnv != null) return { value: fromEnv, source: 'env' };
  return { value: hardcoded, source: 'hardcoded' };
}

/**
 * Resolve effective storage configuration (public + secrets for server use).
 */
async function resolveStorageConfig() {
  const rows = await loadStorageConfigRows();

  const lockedPick = pick(rows.locked, null, 'false');
  const locked = asBool(lockedPick.value, false);

  let driverPick = pick(rows.driver, 'FILES_DRIVER', 'local');
  let driver = String(driverPick.value || 'local').toLowerCase();
  if (!DRIVERS.has(driver)) driver = 'local';

  // ENV bootstrap: if still local and unlocked, detect cloud from env credentials
  if (driver === 'local' && !locked) {
    const s3Bucket = pick(rows['s3.bucket'], 'S3_BUCKET', '').value;
    const gcsBucket = pick(rows['gcs.bucket'], 'GCS_BUCKET', '').value;
    const hasS3Keys = Boolean(env.s3.accessKeyId && env.s3.secretAccessKey);
    const hasGcsKeys = Boolean(
      (env.gcs.clientEmail && env.gcs.privateKey) || env.gcs.credentialsJson
    );
    const filesDriverEnv = String(env.filesDriver || 'local').toLowerCase();
    if (filesDriverEnv === 's3' && s3Bucket && hasS3Keys) {
      driver = 's3';
      driverPick = { value: 's3', source: 'env' };
    } else if (filesDriverEnv === 'gcs' && gcsBucket && hasGcsKeys) {
      driver = 'gcs';
      driverPick = { value: 'gcs', source: 'env' };
    } else if (s3Bucket && hasS3Keys && filesDriverEnv === 's3') {
      driver = 's3';
      driverPick = { value: 's3', source: 'env' };
    } else if (gcsBucket && hasGcsKeys && filesDriverEnv === 'gcs') {
      driver = 'gcs';
      driverPick = { value: 'gcs', source: 'env' };
    }
  }

  const keyPrefixPick = pick(rows.key_prefix, 'FILES_KEY_PREFIX', env.filesKeyPrefix || 'kunk/');
  let keyPrefix = String(keyPrefixPick.value || 'kunk/');
  if (!keyPrefix.endsWith('/')) keyPrefix += '/';

  const s3Bucket = pick(rows['s3.bucket'], 'S3_BUCKET', env.s3.bucket || '');
  const s3Region = pick(rows['s3.region'], 'S3_REGION', env.s3.region || 'us-east-1');

  const gcsBucket = pick(rows['gcs.bucket'], 'GCS_BUCKET', env.gcs.bucket || '');
  const gcsProject = pick(rows['gcs.project_id'], 'GCS_PROJECT_ID', env.gcs.projectId || '');

  const s3Creds = await credentialsService.resolveAll('storage_s3');
  const gcsCreds = await credentialsService.resolveAll('storage_gcs');

  return {
    driver,
    driverSource: driverPick.source,
    locked,
    keyPrefix,
    local: {
      path: env.storagePath,
    },
    s3: {
      bucket: s3Bucket.value,
      region: s3Region.value,
      accessKeyId: s3Creds.access_key_id || env.s3.accessKeyId || '',
      secretAccessKey: s3Creds.secret_access_key || env.s3.secretAccessKey || '',
    },
    gcs: {
      bucket: gcsBucket.value,
      projectId: gcsProject.value,
      clientEmail: gcsCreds.client_email || env.gcs.clientEmail || '',
      privateKey: (gcsCreds.private_key || env.gcs.privateKey || '').replace(/\\n/g, '\n'),
      credentialsJson: gcsCreds.credentials_json || env.gcs.credentialsJson || '',
    },
  };
}

function assertCloudConfig(cfg, driver = cfg.driver) {
  if (driver === 's3') {
    const missing = [];
    if (!cfg.s3.bucket) missing.push('s3.bucket');
    if (!cfg.s3.accessKeyId) missing.push('access_key_id');
    if (!cfg.s3.secretAccessKey) missing.push('secret_access_key');
    if (missing.length) {
      throw new AppError(400, 'STORAGE_MISCONFIGURED', `S3 incompleto: ${missing.join(', ')}`);
    }
  } else if (driver === 'gcs') {
    const missing = [];
    if (!cfg.gcs.bucket) missing.push('gcs.bucket');
    const hasJson = Boolean(cfg.gcs.credentialsJson);
    const hasPair = Boolean(cfg.gcs.clientEmail && cfg.gcs.privateKey);
    if (!hasJson && !hasPair) {
      missing.push('credentials_json ou client_email+private_key');
    }
    if (missing.length) {
      throw new AppError(400, 'STORAGE_MISCONFIGURED', `GCS incompleto: ${missing.join(', ')}`);
    }
  }
}

async function setStorageConfigValue(key, value) {
  const result = await query(
    `UPDATE system_configs
     SET value = $1, date_updated = NOW()
     WHERE system = 'storage' AND key = $2
     RETURNING id`,
    [value == null || value === '' ? null : String(value), key]
  );
  if (!result.rows[0]) {
    throw new AppError(404, 'NOT_FOUND', `Config storage.${key} não encontrada — rode o seed SQL`);
  }
}

module.exports = {
  DRIVERS,
  resolveStorageConfig,
  assertCloudConfig,
  setStorageConfigValue,
  asBool,
};
