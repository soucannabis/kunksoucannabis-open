'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { loginAsAdmin } = require('../helpers/auth');

describe('admin meta', () => {
  let app;
  let cookie;

  before(async () => {
    const session = await loginAsAdmin();
    app = session.app;
    cookie = session.cookie;
  });

  it('GET /admin/schema returns collections', async () => {
    const res = await request(app).get('/api/v1/admin/schema').set('Cookie', cookie);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(Array.isArray(res.body.data.collections));
    assert.ok(res.body.data.collections.some((c) => c.name === 'users'));
    assert.ok(res.body.data.collections.some((c) => c.name === 'tags'));
  });

  it('GET /admin/roles returns known roles', async () => {
    const res = await request(app).get('/api/v1/admin/roles').set('Cookie', cookie);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.some((r) => r.id === 'Administrador'));
    assert.ok(res.body.data.some((r) => r.id === 'Acolhimento'));
  });
});
