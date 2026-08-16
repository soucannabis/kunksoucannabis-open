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
const {
  PHASE,
  normalizePhase,
  phaseEquals,
} = require('../constants/associatePhases');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const router = Router();

/**
 * Sessão de associado no cookie (cadastramento).
 * Em localhost o jar é compartilhado: se houver sessão de operador (cookie app ou Bearer),
 * ignora associate_session — inclusive expirada — para não bloquear upload do Kunk/Admin.
 */
async function resolveAssociateFromCookie(req) {
  const token = req.cookies?.associate_session;
  if (!token) return null;

  const {
    resolveOperatorApp,
    extractOperatorCookieToken,
  } = require('../constants/authCookies');
  const app = resolveOperatorApp(req);
  if (extractBearer(req) || extractOperatorCookieToken(req, app)) {
    return null;
  }

  const row = await associateAuthRepository.resolveSessionRow(token);
  // Cookie associado inválido/expirado: não falha aqui — deixa o authenticate do operador decidir.
  return row || null;
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
      const phase = normalizePhase(associateRow.associate_status);
      const docKind = req.body.doc_kind || 'identity';
      if (docKind === 'identity' && !phaseEquals(phase, PHASE.DOCUMENTOS)) {
        throw new AppError(403, 'PHASE_LOCKED', 'Upload de identidade só na fase documentos');
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
 * Assets embutidos em páginas públicas (login, sidebar, página de assinatura do termo)
 * precisam ser legíveis sem auth: branding em system_configs e logo do template do termo.
 */
async function isPubliclyReadableFile(fileId) {
  const id = String(fileId || '').trim();
  if (!id) return false;
  const branding = await query(
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
  if (branding.rows[0]) return true;

  const termLogo = await query(
    `SELECT 1 FROM term_templates WHERE logo_file_id = $1::uuid LIMIT 1`,
    [id]
  );
  return Boolean(termLogo.rows[0]);
}

router.get('/:id/download', async (req, res, next) => {
  try {
    const publicBranding = await isPubliclyReadableFile(req.params.id);
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
      const phase = normalizePhase(associateRow.associate_status);
      if (!phaseEquals(phase, PHASE.DOCUMENTOS)) {
        throw new AppError(403, 'PHASE_LOCKED', 'Remoção de docs só na fase documentos');
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
