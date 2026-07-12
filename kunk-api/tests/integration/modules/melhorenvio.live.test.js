'use strict';

/**
 * Live Melhor Envio integration — skipped unless MODULE_MELHORENVIO_ENABLED=true
 * AND RUN_LIVE_FREIGHT_TESTS=true.
 */
const enabled =
  process.env.MODULE_MELHORENVIO_ENABLED === 'true' &&
  process.env.RUN_LIVE_FREIGHT_TESTS === 'true';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { loginAsAdmin } = require('../../helpers/auth');

describe('melhorenvio live', { skip: !enabled }, () => {
  let app;
  let cookie;

  before(async () => {
    const session = await loginAsAdmin();
    app = session.app;
    cookie = session.cookie;
  });

  it('quotes freight against Melhor Envio API', async () => {
    const res = await request(app)
      .post('/api/v1/modules/melhorenvio/quote')
      .set('Cookie', cookie)
      .send({
        address: {
          street: 'Av. Goiás',
          number: '100',
          city: 'Goiânia',
          state: 'GO',
          cep: '74003010',
        },
      });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data.options));
  });
});
