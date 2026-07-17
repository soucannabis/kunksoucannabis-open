'use strict';

const {
  resolveStorageConfig,
  assertCloudConfig,
  setStorageConfigValue,
  DRIVERS,
} = require('../storage/resolveConfig');
const { buildDriver } = require('../storage');
const credentialsService = require('./credentialsService');
const filesRepository = require('../repositories/filesRepository');
const { AppError } = require('../utils/response');

function publicStatusFromConfig(cfg, extras = {}) {
  const isCloud = cfg.driver === 's3' || cfg.driver === 'gcs';
  return {
    driver: cfg.driver,
    driver_source: cfg.driverSource,
    locked: cfg.locked,
    key_prefix: cfg.keyPrefix,
    is_cloud: isCloud,
    s3: {
      bucket: cfg.s3.bucket || '',
      region: cfg.s3.region || '',
      has_credentials: Boolean(cfg.s3.accessKeyId && cfg.s3.secretAccessKey),
    },
    gcs: {
      bucket: cfg.gcs.bucket || '',
      project_id: cfg.gcs.projectId || '',
      has_credentials: Boolean(
        cfg.gcs.credentialsJson || (cfg.gcs.clientEmail && cfg.gcs.privateKey)
      ),
    },
    local: {
      path: cfg.local.path,
    },
    ...extras,
  };
}

async function getStatus() {
  const cfg = await resolveStorageConfig();
  const [localPending, cloudCount] = await Promise.all([
    filesRepository.countLocalFiles(),
    filesRepository.countCloudFiles(),
  ]);
  const [s3Creds, gcsCreds] = await Promise.all([
    credentialsService.listPublic('storage_s3'),
    credentialsService.listPublic('storage_gcs'),
  ]);
  return publicStatusFromConfig(cfg, {
    local_files_pending: localPending,
    cloud_files_count: cloudCount,
    // Sempre permite alterar bucket/credenciais; troca de provedor só se não houver arquivos na nuvem
    can_change: true,
    can_change_provider: cloudCount === 0,
    credentials: {
      storage_s3: s3Creds,
      storage_gcs: gcsCreds,
    },
  });
}

async function assertCanChangeProvider(cfg, nextDriver) {
  const cloudCount = await filesRepository.countCloudFiles();
  if (cfg.driver !== 'local' && nextDriver === 'local') {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Não é possível voltar para armazenamento local após ativar nuvem'
    );
  }
  if (
    cfg.driver !== 'local' &&
    nextDriver &&
    nextDriver !== cfg.driver &&
    cloudCount > 0
  ) {
    throw new AppError(
      409,
      'STORAGE_LOCKED',
      'Já existem arquivos no bucket atual. Não é possível trocar de provedor (S3 ↔ GCS). Você pode alterar o nome do bucket do mesmo provedor.'
    );
  }
}

/**
 * Save public config + optional credentials. Does not activate driver unless activate=true path.
 */
async function saveConfig(body = {}) {
  const cfg = await resolveStorageConfig();
  const driver = body.driver != null ? String(body.driver).toLowerCase() : null;

  if (driver && !DRIVERS.has(driver)) {
    throw new AppError(400, 'VALIDATION_ERROR', `driver inválido: ${driver}`);
  }

  if (driver && driver !== cfg.driver) {
    await assertCanChangeProvider(cfg, driver);
  }

  if (body.key_prefix != null) {
    await setStorageConfigValue('key_prefix', body.key_prefix);
  }

  if (body.s3 && typeof body.s3 === 'object') {
    if (body.s3.bucket != null) await setStorageConfigValue('s3.bucket', body.s3.bucket);
    if (body.s3.region != null) await setStorageConfigValue('s3.region', body.s3.region);
  }

  if (body.gcs && typeof body.gcs === 'object') {
    if (body.gcs.bucket != null) await setStorageConfigValue('gcs.bucket', body.gcs.bucket);
    if (body.gcs.project_id != null) await setStorageConfigValue('gcs.project_id', body.gcs.project_id);
  }

  if (body.credentials?.storage_s3 && typeof body.credentials.storage_s3 === 'object') {
    const fields = Object.fromEntries(
      Object.entries(body.credentials.storage_s3).filter(([, v]) => v != null && String(v).trim() !== '')
    );
    if (Object.keys(fields).length) {
      await credentialsService.putCredentials('storage_s3', fields, { runTest: false });
    }
  }
  if (body.credentials?.storage_gcs && typeof body.credentials.storage_gcs === 'object') {
    const fields = Object.fromEntries(
      Object.entries(body.credentials.storage_gcs).filter(([, v]) => v != null && String(v).trim() !== '')
    );
    if (Object.keys(fields).length) {
      await credentialsService.putCredentials('storage_gcs', fields, { runTest: false });
    }
  }

  // Persist driver only when explicitly requested and not activating yet —
  // activate endpoint sets driver after successful test.
  if (driver && body.set_driver === true) {
    await setStorageConfigValue('driver', driver);
  }

  return getStatus();
}

async function testConnection(body = {}) {
  // Optionally merge pending body into a temp config for test-before-save
  let cfg = await resolveStorageConfig();
  const driver = String(body.driver || cfg.driver || 'local').toLowerCase();

  if (body.s3) {
    cfg = {
      ...cfg,
      s3: {
        ...cfg.s3,
        bucket: body.s3.bucket != null ? body.s3.bucket : cfg.s3.bucket,
        region: body.s3.region != null ? body.s3.region : cfg.s3.region,
        accessKeyId: body.credentials?.storage_s3?.access_key_id || cfg.s3.accessKeyId,
        secretAccessKey: body.credentials?.storage_s3?.secret_access_key || cfg.s3.secretAccessKey,
      },
    };
  }
  if (body.gcs) {
    cfg = {
      ...cfg,
      gcs: {
        ...cfg.gcs,
        bucket: body.gcs.bucket != null ? body.gcs.bucket : cfg.gcs.bucket,
        projectId: body.gcs.project_id != null ? body.gcs.project_id : cfg.gcs.projectId,
        clientEmail: body.credentials?.storage_gcs?.client_email || cfg.gcs.clientEmail,
        privateKey: (body.credentials?.storage_gcs?.private_key || cfg.gcs.privateKey || '').replace(
          /\\n/g,
          '\n'
        ),
        credentialsJson: body.credentials?.storage_gcs?.credentials_json || cfg.gcs.credentialsJson,
      },
    };
  }

  if (driver === 'local') {
    const local = buildDriver('local', cfg);
    return local.test();
  }

  assertCloudConfig(cfg, driver);
  const d = buildDriver(driver, cfg);
  const result = await d.test();

  // Teste OK → persistir config pública + credenciais enviadas no formulário
  await saveConfig({
    ...body,
    driver,
    set_driver: false,
  });

  const service = driver === 's3' ? 'storage_s3' : 'storage_gcs';
  await credentialsService.markTestResult(service, true);

  const status = await getStatus();
  return {
    ...result,
    saved: true,
    message: `${result.message}. Credenciais salvas.`,
    status,
  };
}

async function activate(body = {}) {
  const driver = String(body.driver || '').toLowerCase();
  if (driver !== 's3' && driver !== 'gcs') {
    throw new AppError(400, 'VALIDATION_ERROR', 'driver deve ser s3 ou gcs');
  }

  const cfg = await resolveStorageConfig();
  await assertCanChangeProvider(cfg, driver);

  await saveConfig({
    ...body,
    driver,
    set_driver: false,
  });

  const testResult = await testConnection({ ...body, driver });
  await setStorageConfigValue('driver', driver);
  await setStorageConfigValue('locked', 'true');

  const status = await getStatus();
  return {
    ...status,
    test: testResult,
    message: 'Bucket ativado. Novos uploads usarão este armazenamento.',
  };
}

module.exports = {
  getStatus,
  saveConfig,
  testConnection,
  activate,
};
