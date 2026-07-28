'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { loginAsAdmin } = require('../../helpers/auth');

describe('admin/storage', () => {
  let app;
  let cookie;

  before(async () => {
    const session = await loginAsAdmin();
    app = session.app;
    cookie = session.cookie;
  });

  it('GET /admin/storage returns driver status', async () => {
    const res = await request(app).get('/api/v1/admin/storage').set('Cookie', cookie);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(res.body.data);
    assert.ok(['local', 's3', 'gcs'].includes(res.body.data.driver));
    assert.equal(typeof res.body.data.locked, 'boolean');
    assert.equal(typeof res.body.data.is_cloud, 'boolean');
  });

  it('rejects unauthenticated access to storage', async () => {
    const res = await request(app).get('/api/v1/admin/storage');
    assert.ok(res.status === 401 || res.status === 403);
  });
});
