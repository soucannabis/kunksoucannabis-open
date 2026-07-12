'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { loginAsAdmin } = require('../../helpers/auth');
const { env } = require('../../../src/config/env');

describe('modules/disabled', () => {
  let app;
  let cookie;

  before(async () => {
    const session = await loginAsAdmin();
    app = session.app;
    cookie = session.cookie;
  });

  it('lists modules', async () => {
    const res = await request(app).get('/api/v1/modules').set('Cookie', cookie);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.every((m) => typeof m.enabled === 'boolean'));
  });

  it('returns 503 MODULE_DISABLED when off', async () => {
    assert.equal(env.modules.loggi, false);
    const res = await request(app).get('/api/v1/modules/loggi').set('Cookie', cookie);
    assert.equal(res.status, 503);
    assert.equal(res.body.errors[0].code, 'MODULE_DISABLED');
  });

  it('returns 503 for melhorenvio when off', async () => {
    assert.equal(env.modules.melhorenvio, false);
    const res = await request(app).get('/api/v1/modules/melhorenvio').set('Cookie', cookie);
    assert.equal(res.status, 503);
    assert.equal(res.body.errors[0].code, 'MODULE_DISABLED');
  });

  it('returns 503 for loggi quote when off', async () => {
    const res = await request(app)
      .post('/api/v1/modules/loggi/quote-freight')
      .set('Cookie', cookie)
      .send({ address: { cep: '74000000' } });
    assert.equal(res.status, 503);
    assert.equal(res.body.errors[0].code, 'MODULE_DISABLED');
  });

  it('enabled module responds when flag on', async () => {
    const previous = env.modules.pagarme;
    env.modules.pagarme = true;
    try {
      const res = await request(app).get('/api/v1/modules/pagarme').set('Cookie', cookie);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.module, 'pagarme');
    } finally {
      env.modules.pagarme = previous;
    }
  });
});
