'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { mapPgError } = require('../../src/middleware/errorHandler');
const { AppError } = require('../../src/utils/response');

describe('mapPgError', () => {
  it('maps foreign_key_violation to VALIDATION_ERROR', () => {
    const mapped = mapPgError({
      code: '23503',
      constraint: 'fk_services_professional_id',
      table: 'services',
      detail: 'Key (professional_id)=(...) is not present in table "professionals".',
    });
    assert.ok(mapped instanceof AppError);
    assert.equal(mapped.status, 400);
    assert.equal(mapped.code, 'VALIDATION_ERROR');
    assert.equal(mapped.details.constraint, 'fk_services_professional_id');
  });

  it('maps unique_violation to CONFLICT', () => {
    const mapped = mapPgError({ code: '23505', constraint: 'users_email_key' });
    assert.equal(mapped.status, 409);
    assert.equal(mapped.code, 'CONFLICT');
  });

  it('maps invalid uuid format to VALIDATION_ERROR', () => {
    const mapped = mapPgError({ code: '22P02' });
    assert.equal(mapped.status, 400);
    assert.equal(mapped.code, 'VALIDATION_ERROR');
  });

  it('returns null for unknown codes', () => {
    assert.equal(mapPgError({ code: '42P01' }), null);
  });
});
