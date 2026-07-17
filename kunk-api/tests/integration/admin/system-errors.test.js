'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { loginAsAdmin } = require('../../helpers/auth');

describe('admin/system-errors', () => {
  let app;
  let cookie;
  let errorHash;

  before(async () => {
    const session = await loginAsAdmin();
    app = session.app;
    cookie = session.cookie;
  });

  it('POST /system-errors records an event', async () => {
    const res = await request(app)
      .post('/api/v1/system-errors')
      .send({
        source: 'frontend',
        app: 'admin',
        message: `e2e-admin-error-${Date.now()}`,
        code: 'E2E_TEST',
      });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.ok(res.body.data.id);
    assert.ok(res.body.data.error_hash);
    errorHash = res.body.data.error_hash;
  });

  it('GET /admin/system-errors/summary', async () => {
    const res = await request(app)
      .get('/api/v1/admin/system-errors/summary')
      .set('Cookie', cookie);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(res.body.data);
  });

  it('GET /admin/system-errors lists rows', async () => {
    const res = await request(app)
      .get('/api/v1/admin/system-errors?limit=20')
      .set('Cookie', cookie);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(Array.isArray(res.body.data));
  });

  it('GET /admin/system-errors/top', async () => {
    const res = await request(app)
      .get('/api/v1/admin/system-errors/top?period=30d&limit=10')
      .set('Cookie', cookie);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(Array.isArray(res.body.data));
  });

  it('GET samples for hash when recorded', async () => {
    if (!errorHash) return;
    const res = await request(app)
      .get(`/api/v1/admin/system-errors/${errorHash}/samples?limit=5`)
      .set('Cookie', cookie);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(Array.isArray(res.body.data));
  });
});
