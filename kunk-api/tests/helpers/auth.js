'use strict';

const request = require('supertest');
const { getApp } = require('./app');
const { ensureAdminUser } = require('./db');

function extractCookie(setCookie, name = 'kunk_oss_session') {
  if (!setCookie) return null;
  const list = Array.isArray(setCookie) ? setCookie : [setCookie];
  const raw = list.find((c) => String(c).startsWith(`${name}=`)) || list[0];
  return String(raw).split(';')[0];
}

function extractAssociateCookie(setCookie) {
  return extractCookie(setCookie, 'associate_session');
}

async function loginAsAdmin() {
  const app = getApp();
  const creds = await ensureAdminUser();
  const res = await request(app).post('/api/v1/auth/login').send(creds);
  if (res.status !== 200) {
    throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const cookie = extractCookie(res.headers['set-cookie']);
  return { app, cookie, user: res.body.data.user, creds };
}

async function loginAsOperator(overrides = {}) {
  const { ensureOperatorUser } = require('./db');
  const app = getApp();
  const creds = await ensureOperatorUser(overrides);
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: creds.email, password: creds.password });
  if (res.status !== 200) {
    throw new Error(`operator login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const cookie = extractCookie(res.headers['set-cookie']);
  return { app, cookie, user: res.body.data.user, creds };
}

async function createBearerToken(cookie) {
  const app = getApp();
  const res = await request(app)
    .post('/api/v1/auth/tokens')
    .set('Cookie', cookie)
    .send({ email: 'integration-token', scopes: ['*'] });
  if (res.status !== 201) {
    throw new Error(`token create failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data.token;
}

module.exports = { loginAsAdmin, loginAsOperator, createBearerToken, extractCookie, extractAssociateCookie };
