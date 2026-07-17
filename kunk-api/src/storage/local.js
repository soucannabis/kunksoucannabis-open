'use strict';

const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const { Readable } = require('stream');
const { AppError } = require('../utils/response');
const { loadProbeFile } = require('./probe');

function createLocalDriver({ rootPath }) {
  const root = rootPath;

  async function ensureRoot() {
    await fsp.mkdir(root, { recursive: true });
  }

  function resolveKey(key) {
    if (!key) throw new AppError(500, 'STORAGE_ERROR', 'storage_key ausente');
    if (path.isAbsolute(key)) return key;
    return path.join(root, key);
  }

  return {
    name: 'local',
    async put({ key, buffer }) {
      await ensureRoot();
      const abs = resolveKey(key);
      await fsp.mkdir(path.dirname(abs), { recursive: true });
      await fsp.writeFile(abs, buffer);
      return { key, absolutePath: abs };
    },
    async get({ key }) {
      const abs = resolveKey(key);
      if (!fs.existsSync(abs)) {
        throw new AppError(404, 'NOT_FOUND', 'Arquivo físico não encontrado');
      }
      return fs.createReadStream(abs);
    },
    async getBuffer({ key }) {
      const abs = resolveKey(key);
      if (!fs.existsSync(abs)) {
        throw new AppError(404, 'NOT_FOUND', 'Arquivo físico não encontrado');
      }
      return fsp.readFile(abs);
    },
    async delete({ key }) {
      const abs = resolveKey(key);
      try {
        await fsp.unlink(abs);
      } catch {
        /* ignore missing */
      }
    },
    async exists({ key }) {
      return fs.existsSync(resolveKey(key));
    },
    async test() {
      await ensureRoot();
      const probe = loadProbeFile();
      await this.put({ key: probe.key, buffer: probe.buffer, mimeType: probe.mimeType });
      const roundtrip = await this.getBuffer({ key: probe.key });
      await this.delete({ key: probe.key });
      if (!Buffer.isBuffer(roundtrip) || roundtrip.length === 0) {
        throw new AppError(500, 'STORAGE_ERROR', 'Probe local falhou: arquivo vazio após upload');
      }
      return {
        ok: true,
        message: `Disco local acessível (enviado ${probe.filename})`,
        probe_key: probe.key,
      };
    },
  };
}

/** Convert stream/buffer helpers for callers expecting Buffer */
async function streamToBuffer(stream) {
  if (Buffer.isBuffer(stream)) return stream;
  if (stream instanceof Readable || (stream && typeof stream.pipe === 'function')) {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  throw new AppError(500, 'STORAGE_ERROR', 'Resposta de storage inválida');
}

module.exports = { createLocalDriver, streamToBuffer };
