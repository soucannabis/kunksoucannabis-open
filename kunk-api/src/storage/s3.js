'use strict';

const { Readable } = require('stream');
const { AppError } = require('../utils/response');
const { loadProbeFile } = require('./probe');

function createS3Driver(cfg) {
  let S3Client;
  let PutObjectCommand;
  let GetObjectCommand;
  let DeleteObjectCommand;
  let HeadBucketCommand;
  try {
    ({
      S3Client,
      PutObjectCommand,
      GetObjectCommand,
      DeleteObjectCommand,
      HeadBucketCommand,
    } = require('@aws-sdk/client-s3'));
  } catch (err) {
    throw new AppError(
      500,
      'STORAGE_MISCONFIGURED',
      `Pacote @aws-sdk/client-s3 não instalado no container: ${err.message}`
    );
  }

  const clientConfig = {
    region: cfg.region || 'us-east-1',
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  };
  const client = new S3Client(clientConfig);
  const bucket = cfg.bucket;

  return {
    name: 's3',
    async put({ key, buffer, mimeType }) {
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: mimeType || 'application/octet-stream',
          })
        );
        return { key };
      } catch (err) {
        throw new AppError(502, 'STORAGE_ERROR', `S3 put falhou: ${err.message}`);
      }
    },
    async get({ key }) {
      try {
        const out = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: key })
        );
        if (!out.Body) {
          throw new AppError(404, 'NOT_FOUND', 'Objeto S3 vazio');
        }
        if (typeof out.Body.transformToWebStream === 'function') {
          return Readable.fromWeb(out.Body.transformToWebStream());
        }
        return out.Body;
      } catch (err) {
        if (err instanceof AppError) throw err;
        if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
          throw new AppError(404, 'NOT_FOUND', 'Arquivo físico não encontrado');
        }
        throw new AppError(502, 'STORAGE_ERROR', `S3 get falhou: ${err.message}`);
      }
    },
    async getBuffer({ key }) {
      const stream = await this.get({ key });
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    },
    async delete({ key }) {
      try {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      } catch {
        /* best-effort */
      }
    },
    async exists({ key }) {
      try {
        await this.getBuffer({ key });
        return true;
      } catch (err) {
        if (err.code === 'NOT_FOUND') return false;
        throw err;
      }
    },
    async test() {
      try {
        await client.send(new HeadBucketCommand({ Bucket: bucket }));
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
          throw new AppError(400, 'STORAGE_MISCONFIGURED', 'Probe S3 falhou: arquivo vazio após upload');
        }
        return {
          ok: true,
          message: `Bucket S3 "${bucket}" acessível — arquivo de teste ${probe.filename} enviado e removido`,
          probe_key: probe.key,
        };
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError(400, 'STORAGE_MISCONFIGURED', `Teste S3 falhou: ${err.message}`);
      }
    },
  };
}

module.exports = { createS3Driver };
