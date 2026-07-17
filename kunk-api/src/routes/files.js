'use strict';

const { Router } = require('express');
const multer = require('multer');
const filesRepository = require('../repositories/filesRepository');
const associateAuthRepository = require('../repositories/associateAuthRepository');
const registrationService = require('../services/registrationService');
const { authenticate, extractBearer } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { ok, AppError } = require('../utils/response');
const { query } = require('../db/pool');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const router = Router();

async function resolveAssociateFromCookie(req) {
  const token = req.cookies?.associate_session;
  if (!token) return null;
  // Ignore operator kunk_oss_session on localhost (shared across ports).
  if (extractBearer(req)) {
    throw new AppError(401, 'AUTH_CONFLICT', 'Use cookie ou Bearer, não ambos');
  }
  const row = await associateAuthRepository.resolveSessionRow(token);
  if (!row) throw new AppError(401, 'UNAUTHORIZED', 'Sessão inválida ou expirada');
  return row;
}

router.get('/', authenticate, authorize('files', 'read'), async (req, res, next) => {
  try {
    const limit = req.query.limit;
    const offset = req.query.offset;
    const search = req.query.search ? String(req.query.search) : null;
    const userId = req.query.user_id != null && req.query.user_id !== '' ? req.query.user_id : null;
    const docKind = req.query.doc_kind ? String(req.query.doc_kind) : null;
    const result = await filesRepository.listFiles({ limit, offset, search, userId, docKind });
    res.json(ok(result.data, result.meta));
  } catch (err) {
    next(err);
  }
});

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError(400, 'VALIDATION_ERROR', 'file é obrigatório');

    const associateRow = await resolveAssociateFromCookie(req);
    if (associateRow) {
      const phase = Number(associateRow.associate_status) || 1;
      const docKind = req.body.doc_kind || 'identity';
      if (docKind === 'identity' && phase !== 3) {
        throw new AppError(403, 'PHASE_LOCKED', 'Upload de identidade só na fase 3');
      }
      if (docKind !== 'identity' && phase < 5) {
        throw new AppError(403, 'PHASE_LOCKED', 'Upload de docs extras só na fase 5');
      }

      const docType = req.body.doc_type || null;
      const side = req.body.side || null;
      const subject = req.body.subject || 'responsible';

      if (docKind === 'identity') {
        if (!['rg', 'cnh'].includes(String(docType))) {
          throw new AppError(400, 'VALIDATION_ERROR', 'doc_type deve ser rg ou cnh');
        }
        if (docType === 'rg' && !['front', 'back'].includes(String(side))) {
          throw new AppError(400, 'VALIDATION_ERROR', 'side deve ser front ou back para RG');
        }
        if (docType === 'cnh' && side && side !== 'front') {
          throw new AppError(400, 'VALIDATION_ERROR', 'CNH usa apenas side=front');
        }
        if (!['responsible', 'patient'].includes(String(subject))) {
          throw new AppError(400, 'VALIDATION_ERROR', 'subject inválido');
        }
      }

      let targetUserId = associateRow.id;
      if (subject === 'patient') {
        const patients = await registrationService.listMyPatients(associateRow);
        if (!patients.length) throw new AppError(400, 'VALIDATION_ERROR', 'Paciente não encontrado');
        targetUserId = patients[0].id;
      }

      const data = await filesRepository.createFile({
        buffer: req.file.buffer,
        filename: req.body.filename || req.file.originalname,
        mimeType: req.file.mimetype,
      });

      await filesRepository.attachFile(data.id, 'users', targetUserId, {
        doc_type: docType,
        side: side || (docType === 'cnh' ? 'front' : null),
        subject,
        doc_kind: docKind,
      });

      return res.status(201).json(ok({ ...data, doc_type: docType, side, subject, doc_kind: docKind }));
    }

    await new Promise((resolve, reject) => {
      authenticate(req, res, (err) => (err ? reject(err) : resolve()));
    });
    await new Promise((resolve, reject) => {
      authorize('files', 'create')(req, res, (err) => (err ? reject(err) : resolve()));
    });

    const filename = req.body.filename || req.file.originalname;
    const data = await filesRepository.createFile({
      buffer: req.file.buffer,
      filename,
      mimeType: req.file.mimetype,
    });

    const userId = req.body.user_id;
    if (userId) {
      const meta = {
        doc_type: req.body.doc_type || null,
        side: req.body.side || null,
        subject: req.body.subject || null,
        doc_kind: req.body.doc_kind || null,
      };
      await filesRepository.attachFile(data.id, 'users', userId, meta);
      return res.status(201).json(ok({ ...data, ...meta, user_id: Number(userId) || userId }));
    }

    res.status(201).json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const associateRow = await resolveAssociateFromCookie(req).catch(() => null);
    if (associateRow) {
      const owned = await query(
        `SELECT 1 FROM users_files uf
         WHERE uf.file_id = $1 AND uf.user_id IN (
           SELECT id FROM users WHERE id = $2 OR responsible_code = $3
         ) LIMIT 1`,
        [req.params.id, associateRow.id, associateRow.user_code]
      );
      if (!owned.rows[0]) throw new AppError(403, 'FORBIDDEN', 'Arquivo não pertence ao associado');
      const data = await filesRepository.getFile(req.params.id);
      return res.json(ok(data));
    }

    await new Promise((resolve, reject) => {
      authenticate(req, res, (err) => (err ? reject(err) : resolve()));
    });
    await new Promise((resolve, reject) => {
      authorize('files', 'read')(req, res, (err) => (err ? reject(err) : resolve()));
    });
    const data = await filesRepository.getFile(req.params.id);
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

/**
 * Branding assets (logo, fundo, etc.) live in system_configs as /files/:id/download
 * and must be readable without auth so login/sidebar <img> and favicon work.
 */
async function isPublicBrandingFile(fileId) {
  const id = String(fileId || '').trim();
  if (!id) return false;
  const result = await query(
    `SELECT 1 FROM system_configs
     WHERE is_sensitive = false
       AND value IS NOT NULL
       AND (
         value = $1
         OR value = $2
         OR value LIKE $3
       )
     LIMIT 1`,
    [id, `/api/v1/files/${id}/download`, `%/files/${id}/%`]
  );
  return Boolean(result.rows[0]);
}

router.get('/:id/download', async (req, res, next) => {
  try {
    const publicBranding = await isPublicBrandingFile(req.params.id);
    if (!publicBranding) {
      const associateRow = await resolveAssociateFromCookie(req).catch(() => null);
      if (associateRow) {
        const owned = await query(
          `SELECT 1 FROM users_files uf
           WHERE uf.file_id = $1 AND uf.user_id IN (
             SELECT id FROM users WHERE id = $2 OR responsible_code = $3
           ) LIMIT 1`,
          [req.params.id, associateRow.id, associateRow.user_code]
        );
        if (!owned.rows[0]) throw new AppError(403, 'FORBIDDEN', 'Arquivo não pertence ao associado');
      } else {
        await new Promise((resolve, reject) => {
          authenticate(req, res, (err) => (err ? reject(err) : resolve()));
        });
        await new Promise((resolve, reject) => {
          authorize('files', 'read')(req, res, (err) => (err ? reject(err) : resolve()));
        });
      }
    }

    const file = await filesRepository.getFile(req.params.id);
    const stream = await filesRepository.openFileStream(file);
    const mime = file.mime_type || 'application/octet-stream';
    const inline = String(mime).startsWith('image/') || mime === 'application/pdf';
    res.setHeader('Content-Type', mime);
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename="${file.filename}"`
    );
    stream.on('error', (err) => next(err));
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const associateRow = await resolveAssociateFromCookie(req);
    if (associateRow) {
      const phase = Number(associateRow.associate_status) || 1;
      if (phase !== 3) {
        throw new AppError(403, 'PHASE_LOCKED', 'Remoção de docs só na fase 3');
      }
      const owned = await query(
        `SELECT uf.id FROM users_files uf
         WHERE uf.file_id = $1 AND uf.user_id IN (
           SELECT id FROM users WHERE id = $2 OR responsible_code = $3
         ) LIMIT 1`,
        [req.params.id, associateRow.id, associateRow.user_code]
      );
      if (!owned.rows[0]) throw new AppError(403, 'FORBIDDEN', 'Arquivo não pertence ao associado');
      const data = await filesRepository.deleteFile(req.params.id);
      return res.json(ok(data));
    }

    await new Promise((resolve, reject) => {
      authenticate(req, res, (err) => (err ? reject(err) : resolve()));
    });
    await new Promise((resolve, reject) => {
      authorize('files', 'delete')(req, res, (err) => (err ? reject(err) : resolve()));
    });
    const data = await filesRepository.deleteFile(req.params.id);
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/attach', authenticate, authorize('files', 'create'), async (req, res, next) => {
  try {
    const body = req.body || {};
    const { collection, item_id: itemId } = body;
    const meta = {
      doc_type: body.doc_type || null,
      side: body.side || null,
      subject: body.subject || null,
      doc_kind: body.doc_kind || null,
    };
    const data = await filesRepository.attachFile(req.params.id, collection, itemId, meta);
    res.status(201).json(ok(data));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/attach', authenticate, authorize('files', 'delete'), async (req, res, next) => {
  try {
    const { collection, item_id: itemId } = req.body || {};
    const data = await filesRepository.detachFile(req.params.id, collection, itemId);
    res.json(ok(data));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
