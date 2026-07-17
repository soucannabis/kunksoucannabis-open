'use strict';

const { AppError } = require('../utils/response');
const { loadProbeFile } = require('./probe');

function buildCredentials(cfg) {
  if (cfg.credentialsJson) {
    try {
      const parsed =
        typeof cfg.credentialsJson === 'string'
          ? JSON.parse(cfg.credentialsJson)
          : cfg.credentialsJson;
      return parsed;
    } catch (err) {
      throw new AppError(400, 'STORAGE_MISCONFIGURED', `GCS credentials_json inválido: ${err.message}`);
    }
  }
  if (cfg.clientEmail && cfg.privateKey) {
    return {
      client_email: cfg.clientEmail,
      private_key: cfg.privateKey,
    };
  }
  return null;
}

function createGcsDriver(cfg) {
  let Storage;
  try {
    ({ Storage } = require('@google-cloud/storage'));
  } catch (err) {
    throw new AppError(
      500,
      'STORAGE_MISCONFIGURED',
      `Pacote @google-cloud/storage não instalado no container: ${err.message}`
    );
  }

  const credentials = buildCredentials(cfg);
  const storageOpts = {};
  if (cfg.projectId) storageOpts.projectId = cfg.projectId;
  if (credentials) storageOpts.credentials = credentials;

  const storage = new Storage(storageOpts);
  const bucket = storage.bucket(cfg.bucket);

  return {
    name: 'gcs',
    async put({ key, buffer, mimeType }) {
      try {
        const file = bucket.file(key);
        await file.save(buffer, {
          contentType: mimeType || 'application/octet-stream',
          resumable: false,
        });
        return { key };
      } catch (err) {
        throw new AppError(502, 'STORAGE_ERROR', `GCS put falhou: ${err.message}`);
      }
    },
    async get({ key }) {
      try {
        const file = bucket.file(key);
        const [exists] = await file.exists();
        if (!exists) {
          throw new AppError(404, 'NOT_FOUND', 'Arquivo físico não encontrado');
        }
        return file.createReadStream();
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError(502, 'STORAGE_ERROR', `GCS get falhou: ${err.message}`);
      }
    },
    async getBuffer({ key }) {
      try {
        const file = bucket.file(key);
        const [buf] = await file.download();
        return buf;
      } catch (err) {
        if (err.code === 404) {
          throw new AppError(404, 'NOT_FOUND', 'Arquivo físico não encontrado');
        }
        throw new AppError(502, 'STORAGE_ERROR', `GCS get falhou: ${err.message}`);
      }
    },
    async delete({ key }) {
      try {
        await bucket.file(key).delete({ ignoreNotFound: true });
      } catch {
        /* best-effort */
      }
    },
    async exists({ key }) {
      const [exists] = await bucket.file(key).exists();
      return Boolean(exists);
    },
    async test() {
      try {
        const [exists] = await bucket.exists();
        if (!exists) {
          throw new AppError(400, 'STORAGE_MISCONFIGURED', `Bucket GCS "${cfg.bucket}" não existe`);
        }
        const probe = loadProbeFile();
        await this.put({
          key: probe.key,
          buffer: probe.buffer,
          mimeType: probe.mimeType,
          filename: probe.filename,
        });
        const roundtrip = await this.getBuffer({ key: probe.key });
        await this.delete({ key: probe.key });
        if (!Buffer.isBuffer(roundtrip) || roundtrip.length === 0) {
          throw new AppError(400, 'STORAGE_MISCONFIGURED', 'Probe GCS falhou: arquivo vazio após upload');
        }
        return {
          ok: true,
          message: `Bucket GCS "${cfg.bucket}" acessível — arquivo de teste ${probe.filename} enviado e removido`,
          probe_key: probe.key,
        };
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError(400, 'STORAGE_MISCONFIGURED', `Teste GCS falhou: ${err.message}`);
      }
    },
  };
}

module.exports = { createGcsDriver };
