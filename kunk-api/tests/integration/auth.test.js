'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { loginAsAdmin, createBearerToken, extractCookie, setApiAccessEnabled } = require('../helpers/auth');
const { getApp } = require('../helpers/app');
const { ensureAdminUser } = require('../helpers/db');

describe('auth', () => {
  let app;
  let cookie;

  async function refreshSession() {
    const session = await loginAsAdmin();
    app = session.app;
    cookie = session.cookie;
  }

  before(async () => {
    await refreshSession();
  });

  it('login success sets cookie and returns user without secrets', async () => {
    const creds = await ensureAdminUser();
    const res = await request(app).post('/api/v1/auth/login').send(creds);
    assert.equal(res.status, 200);
    assert.ok(res.body.data.user.email);
    assert.equal(res.body.data.user.password, undefined);
    assert.equal(res.body.data.user.session_token, undefined);
    assert.ok(res.headers['set-cookie']);
    cookie = extractCookie(res.headers['set-cookie']);
  });

  it('login validation error', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.errors[0].code, 'VALIDATION_ERROR');
  });

  it('login invalid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@kunk-api.test', password: 'wrong' });
    assert.equal(res.status, 401);
    assert.equal(res.body.errors[0].code, 'INVALID_CREDENTIALS');
  });

  it('me with cookie', async () => {
    await refreshSession();
    const res = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);
    assert.equal(res.status, 200);
    assert.ok(res.body.data.user.id);
  });

  it('me unauthorized without auth', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    assert.equal(res.status, 401);
  });

  it('tokens blocked when API disabled', async () => {
    await refreshSession();
    await setApiAccessEnabled(false);

    const created = await request(app)
      .post('/api/v1/auth/tokens')
      .set('Cookie', cookie)
      .send({ email: 'tok', scopes: ['*'] });
    assert.equal(created.status, 403);
    assert.equal(created.body.errors[0].code, 'API_DISABLED');

    const list = await request(app).get('/api/v1/auth/tokens').set('Cookie', cookie);
    assert.equal(list.status, 403);
    assert.equal(list.body.errors[0].code, 'API_DISABLED');
  });

  it('tokens CRUD when API enabled', async () => {
    await refreshSession();
    await setApiAccessEnabled(true);

    const created = await request(app)
      .post('/api/v1/auth/tokens')
      .set('Cookie', cookie)
      .send({ email: 'tok', scopes: ['*'] });
    assert.equal(created.status, 201);
    assert.ok(created.body.data.token.startsWith('kunk_live_'));
    assert.ok(created.body.data.label || created.body.data.email);

    const list = await request(app).get('/api/v1/auth/tokens').set('Cookie', cookie);
    assert.equal(list.status, 200);
    assert.ok(Array.isArray(list.body.data));
    assert.ok(!JSON.stringify(list.body.data).includes(created.body.data.token));

    const patched = await request(app)
      .patch(`/api/v1/auth/tokens/${created.body.data.id}`)
      .set('Cookie', cookie)
      .send({ label: 'tok-updated', scopes: ['items:orders:read'] });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.data.label, 'tok-updated');
    assert.deepEqual(patched.body.data.scopes, ['items:orders:read']);

    const del = await request(app)
      .delete(`/api/v1/auth/tokens/${created.body.data.id}`)
      .set('Cookie', cookie);
    assert.equal(del.status, 200);
  });

  it('rejects invalid token scopes', async () => {
    await refreshSession();
    await setApiAccessEnabled(true);
    const res = await request(app)
      .post('/api/v1/auth/tokens')
      .set('Cookie', cookie)
      .send({ label: 'bad', scopes: ['items:users_api:read'] });
    assert.equal(res.status, 400);
    assert.equal(res.body.errors[0].code, 'VALIDATION_ERROR');
  });

  it('bearer auth works when API enabled', async () => {
    await refreshSession();
    const token = await createBearerToken(cookie);
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
  });

  it('bearer auth rejected when API disabled', async () => {
    await refreshSession();
    const token = await createBearerToken(cookie);
    await setApiAccessEnabled(false);
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 401);
    assert.equal(res.body.errors[0].code, 'API_DISABLED');
    await setApiAccessEnabled(true);
  });

  it('scoped bearer respects hasScope on items', async () => {
    await refreshSession();
    const token = await createBearerToken(cookie, ['items:products:read']);
    const okRead = await request(app)
      .get('/api/v1/items/products')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(okRead.status, 200);

    const denied = await request(app)
      .get('/api/v1/items/orders')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(denied.status, 403);
  });

  it('cookie + bearer conflict', async () => {
    await refreshSession();
    const token = await createBearerToken(cookie);
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', cookie)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 401);
    assert.equal(res.body.errors[0].code, 'AUTH_CONFLICT');
  });

  it('logout', async () => {
    const session = await loginAsAdmin();
    const res = await request(app).post('/api/v1/auth/logout').set('Cookie', session.cookie);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.ok, true);
  });
});
