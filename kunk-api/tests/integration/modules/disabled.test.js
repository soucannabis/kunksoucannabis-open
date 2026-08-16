'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { loginAsAdmin } = require('../../helpers/auth');

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

  it('returns 503 MODULE_DISABLED for usage routes when off', async () => {
    const res = await request(app).get('/api/v1/modules/loggi').set('Cookie', cookie);
    assert.equal(res.status, 503);
    assert.equal(res.body.errors[0].code, 'MODULE_DISABLED');
  });

  it('allows oauth/status setup without module enabled', async () => {
    const res = await request(app)
      .get('/api/v1/modules/google_calendar/oauth/status')
      .set('Cookie', cookie);
    assert.notEqual(res.status, 503);
    assert.notEqual(res.body?.errors?.[0]?.code, 'MODULE_DISABLED');
  });

  it('allows melhorenvio oauth/status without module enabled', async () => {
    const res = await request(app)
      .get('/api/v1/modules/melhorenvio/oauth/status')
      .set('Cookie', cookie);
    assert.notEqual(res.status, 503);
    assert.notEqual(res.body?.errors?.[0]?.code, 'MODULE_DISABLED');
  });

  it('returns 503 for loggi quote when off', async () => {
    const res = await request(app)
      .post('/api/v1/modules/loggi/quote-freight')
      .set('Cookie', cookie)
      .send({ address: { cep: '74000000' } });
    assert.equal(res.status, 503);
    assert.equal(res.body.errors[0].code, 'MODULE_DISABLED');
  });

  it('enabled module responds when Admin flag on', async () => {
    const off = await request(app)
      .patch('/api/v1/admin/external-services/email')
      .set('Cookie', cookie)
      .send({ enabled: false });
    assert.ok(off.status === 200 || off.status === 404 || off.status === 400);

    const on = await request(app)
      .patch('/api/v1/admin/external-services/email')
      .set('Cookie', cookie)
      .send({ enabled: true });
    assert.equal(on.status, 200, JSON.stringify(on.body));

    try {
      const res = await request(app).get('/api/v1/modules/email').set('Cookie', cookie);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.module, 'email');
    } finally {
      await request(app)
        .patch('/api/v1/admin/external-services/email')
        .set('Cookie', cookie)
        .send({ enabled: false });
    }
  });
});
