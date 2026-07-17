'use strict';

const { fail, AppError } = require('../utils/response');
const systemErrorsService = require('../services/systemErrorsService');

/** Extrai constraint / coluna de erros do node-pg. */
function pgDetails(err) {
  const details = {};
  if (err.constraint) details.constraint = err.constraint;
  if (err.table) details.table = err.table;
  if (err.column) details.column = err.column;
  if (err.detail) details.detail = err.detail;
  return Object.keys(details).length ? details : null;
}

function mapPgError(err) {
  switch (err.code) {
    case '23503': // foreign_key_violation
      return new AppError(
        400,
        'VALIDATION_ERROR',
        'Referência inválida: valor não existe na tabela relacionada',
        pgDetails(err)
      );
    case '23505': // unique_violation
      return new AppError(409, 'CONFLICT', 'Registro duplicado (unique)', pgDetails(err));
    case '23502': // not_null_violation
      return new AppError(
        400,
        'VALIDATION_ERROR',
        `Campo obrigatório ausente${err.column ? `: ${err.column}` : ''}`,
        pgDetails(err)
      );
    case '22P02': // invalid_text_representation (ex.: UUID malformado)
      return new AppError(400, 'VALIDATION_ERROR', 'Formato de valor inválido', pgDetails(err));
    default:
      return null;
  }
}

function shouldRecordError(err) {
  if (err instanceof AppError) {
    return err.status >= 500;
  }
  if (err?.type === 'entity.parse.failed') return false;
  const mapped = err?.code ? mapPgError(err) : null;
  if (mapped && mapped.status < 500) return false;
  return true;
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof AppError) {
    if (shouldRecordError(err)) {
      void systemErrorsService.recordSafe(
        systemErrorsService.payloadFromBackendError(err, req)
      );
    }
    return res.status(err.status).json(fail(err.code, err.message, err.details));
  }

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json(fail('VALIDATION_ERROR', 'JSON inválido'));
  }

  const mapped = err?.code ? mapPgError(err) : null;
  if (mapped) {
    return res.status(mapped.status).json(fail(mapped.code, mapped.message, mapped.details));
  }

  console.error('[kunk-api]', err);
  void systemErrorsService.recordSafe(systemErrorsService.payloadFromBackendError(err, req));
  const message =
    process.env.NODE_ENV === 'production' ? 'Erro interno' : err.message || 'Erro interno';
  return res.status(500).json(fail('INTERNAL_ERROR', message));
}

module.exports = { errorHandler, mapPgError, shouldRecordError };
