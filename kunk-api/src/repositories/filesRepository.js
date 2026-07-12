'use strict';

const path = require('path');
const fs = require('fs/promises');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db/pool');
const { env } = require('../config/env');
const { AppError } = require('../utils/response');

const ATTACH_MAP = {
  orders: { table: 'orders_files', fk: 'order_id' },
  users: { table: 'users_files', fk: 'user_id' },
  services: { table: 'services_files', fk: 'service_id' },
};

async function ensureStorage() {
  await fs.mkdir(env.storagePath, { recursive: true });
}

async function createFile({ buffer, filename, mimeType }) {
  await ensureStorage();
  const id = uuidv4();
  const safeName = (filename || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = path.join(env.storagePath, `${id}_${safeName}`);
  await fs.writeFile(storagePath, buffer);

  const result = await query(
    `INSERT INTO files (id, filename, mime_type, storage_path, created_at)
     VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
    [id, filename || safeName, mimeType || 'application/octet-stream', storagePath]
  );

  const row = result.rows[0];
  return {
    ...row,
    url: `/api/v1/files/${row.id}/download`,
  };
}

async function listFiles({ limit = 25, offset = 0, search = null, userId = null, docKind = null } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 25, 1), 100);
  const off = Math.max(Number(offset) || 0, 0);

  if (userId != null && userId !== '') {
    const params = [userId];
    let where = 'WHERE uf.user_id = $1';
    if (docKind) {
      params.push(String(docKind));
      where += ` AND uf.doc_kind = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (f.filename ILIKE $${params.length} OR f.mime_type ILIKE $${params.length})`;
    }
    const countResult = await query(
      `SELECT COUNT(*)::int AS total
       FROM users_files uf
       JOIN files f ON f.id = uf.file_id
       ${where}`,
      params
    );
    params.push(lim, off);
    const result = await query(
      `SELECT f.id, f.filename, f.mime_type, f.storage_path, f.created_at,
              uf.doc_kind, uf.doc_type, uf.side, uf.subject, uf.user_id
       FROM users_files uf
       JOIN files f ON f.id = uf.file_id
       ${where}
       ORDER BY f.created_at DESC NULLS LAST, f.id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return {
      data: result.rows.map((row) => ({
        ...row,
        url: `/api/v1/files/${row.id}/download`,
      })),
      meta: {
        filter_count: countResult.rows[0].total,
        total_count: countResult.rows[0].total,
        limit: lim,
        offset: off,
      },
    };
  }

  const params = [];
  let where = '';
  if (search) {
    params.push(`%${search}%`);
    where = `WHERE filename ILIKE $${params.length} OR mime_type ILIKE $${params.length}`;
  }
  const countResult = await query(`SELECT COUNT(*)::int AS total FROM files ${where}`, params);
  params.push(lim, off);
  const result = await query(
    `SELECT id, filename, mime_type, storage_path, created_at
     FROM files ${where}
     ORDER BY created_at DESC NULLS LAST, id DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return {
    data: result.rows.map((row) => ({
      ...row,
      url: `/api/v1/files/${row.id}/download`,
    })),
    meta: {
      filter_count: countResult.rows[0].total,
      total_count: countResult.rows[0].total,
      limit: lim,
      offset: off,
    },
  };
}

async function getFile(id) {
  const result = await query(`SELECT * FROM files WHERE id = $1`, [id]);
  if (!result.rows[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Arquivo não encontrado');
  }
  return {
    ...result.rows[0],
    url: `/api/v1/files/${id}/download`,
  };
}

async function deleteFile(id) {
  const file = await getFile(id);
  await query(`DELETE FROM orders_files WHERE file_id = $1`, [id]);
  await query(`DELETE FROM users_files WHERE file_id = $1`, [id]);
  await query(`DELETE FROM services_files WHERE file_id = $1`, [id]);
  await query(`DELETE FROM files WHERE id = $1`, [id]);
  try {
    await fs.unlink(file.storage_path);
  } catch {
    /* ignore missing file */
  }
  return { id };
}

async function attachFile(fileId, collection, itemId, meta = {}) {
  const cfg = ATTACH_MAP[collection];
  if (!cfg) {
    throw new AppError(400, 'VALIDATION_ERROR', `Collection de attach inválida: ${collection}`);
  }
  await getFile(fileId);

  if (collection === 'users' && (meta.doc_type || meta.side || meta.subject || meta.doc_kind)) {
    const result = await query(
      `INSERT INTO users_files (user_id, file_id, doc_type, side, subject, doc_kind)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        itemId,
        fileId,
        meta.doc_type || null,
        meta.side || null,
        meta.subject || null,
        meta.doc_kind || null,
      ]
    );
    return result.rows[0];
  }

  const result = await query(
    `INSERT INTO ${cfg.table} (${cfg.fk}, file_id) VALUES ($1, $2) RETURNING *`,
    [itemId, fileId]
  );
  return result.rows[0];
}

async function detachFile(fileId, collection, itemId) {
  const cfg = ATTACH_MAP[collection];
  if (!cfg) {
    throw new AppError(400, 'VALIDATION_ERROR', `Collection de attach inválida: ${collection}`);
  }
  const result = await query(
    `DELETE FROM ${cfg.table} WHERE ${cfg.fk} = $1 AND file_id = $2 RETURNING id`,
    [itemId, fileId]
  );
  if (!result.rows[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Vínculo não encontrado');
  }
  return { id: result.rows[0].id };
}

module.exports = {
  ATTACH_MAP,
  createFile,
  listFiles,
  getFile,
  deleteFile,
  attachFile,
  detachFile,
};
