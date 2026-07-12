'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeWritePayload } = require('../../src/repositories/itemsRepository');
const { AppError } = require('../../src/utils/response');

describe('sanitizeWritePayload', () => {
  it('keeps known columns', () => {
    const out = sanitizeWritePayload('orders', { status: 'Novo', total: 10 });
    assert.equal(out.status, 'Novo');
    assert.equal(out.total, 10);
  });

  it('rejects removed / unknown fields', () => {
    assert.throws(
      () =>
        sanitizeWritePayload('orders', {
          status: 'Novo',
          delivery_problem: { x: 1 },
          partner_code: 'P1',
          melhorenvio_order_id: 'ME-1',
        }),
      (err) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.status, 400);
        assert.equal(err.code, 'VALIDATION_ERROR');
        assert.deepEqual(err.details.unknown_fields.sort(), [
          'delivery_problem',
          'melhorenvio_order_id',
          'partner_code',
        ]);
        return true;
      }
    );
  });

  it('rejects legacy user fields', () => {
    assert.throws(
      () =>
        sanitizeWritePayload('users', {
          associate_name: 'A',
          partner_code: 'X',
          pipefy_card_id: '1',
          medical_prescription: 'x.pdf',
          form_error_log: '[]',
        }),
      (err) => {
        assert.deepEqual(err.details.unknown_fields.sort(), [
          'form_error_log',
          'medical_prescription',
          'partner_code',
          'pipefy_card_id',
        ]);
        return true;
      }
    );
  });

  it('accepts renamed users fields prescription and invalid_fields', () => {
    const out = sanitizeWritePayload('users', {
      associate_name: 'A',
      prescription: 'rx.pdf',
      invalid_fields: '["cep"]',
    });
    assert.equal(out.prescription, 'rx.pdf');
    assert.equal(out.invalid_fields, '["cep"]');
  });

  it('skips undefined values without treating as unknown', () => {
    const out = sanitizeWritePayload('orders', { status: 'Novo', total: undefined });
    assert.equal(out.status, 'Novo');
    assert.equal(out.total, undefined);
  });
});
