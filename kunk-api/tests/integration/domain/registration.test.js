'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { getApp } = require('../../helpers/app');
const { closePool, query, cleanupTestLocalUsers } = require('../../helpers/db');
const { loginAsAdmin, extractAssociateCookie, extractCookie } = require('../../helpers/auth');
const { env } = require('../../../src/config/env');

const VALID_CPF = '52998224725';

function responsiblePayload(overrides = {}) {
  return {
    responsible_type: 'himself',
    associate_name: 'Ana',
    associate_last_name: 'Silva',
    associate_birth_date: '1990-01-15',
    gender: 'mulher-cis',
    nationality: 'Brasileira',
    associate_cpf: VALID_CPF,
    associate_rg: '1234567',
    associate_rg_issuer: 'SSP/SP',
    marital_status: 'Solteiro',
    account_password: 'senha123',
    mobile_number: '5511999999999',
    street: 'Rua A',
    street_number: '100',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    cep: '01310100',
    reason_treatment_text: 'Dor crônica',
    ciap_codes: ['A01', 'P01'],
    ...overrides,
  };
}

describe('registration funnel', () => {
  let app;
  let email;

  before(async () => {
    // Não truncar o banco: preserva sample data. Isolamento via e-mails @test.local.
    app = getApp();
    email = `reg-${Date.now()}@test.local`;
  });

  after(async () => {
    try {
      await cleanupTestLocalUsers();
    } catch {
      /* best-effort */
    }
    await closePool();
  });

  it('auth: register → me → logout → login; 409 exists/in_progress; forgot/reset', async () => {
    const reg = await request(app)
      .post('/api/v1/auth/associate/register-email')
      .send({ email, password: 'senha12345' });
    assert.equal(reg.status, 201, JSON.stringify(reg.body));
    assert.equal(reg.body.data.user.associate_status, 1);
    assert.ok(!reg.body.data.user.account_password);
    const cookie = extractAssociateCookie(reg.headers['set-cookie']);
    assert.ok(cookie.startsWith('associate_session='));

    const me = await request(app).get('/api/v1/auth/associate/me').set('Cookie', cookie);
    assert.equal(me.status, 200);
    assert.equal(me.body.data.user.email_account, email);

    const again = await request(app)
      .post('/api/v1/auth/associate/register-email')
      .send({ email, password: 'senha12345' });
    assert.equal(again.status, 409);
    assert.equal(again.body.errors[0].code, 'ACCOUNT_IN_PROGRESS');

    await request(app).post('/api/v1/auth/associate/logout').set('Cookie', cookie);

    // set password via patch then login
    const reg2 = await request(app)
      .post('/api/v1/auth/associate/register-email')
      .send({ email: `other-${Date.now()}@test.local`, password: 'senha12345' });
    const c2 = extractAssociateCookie(reg2.headers['set-cookie']);
    await request(app)
      .patch('/api/v1/users/me')
      .set('Cookie', c2)
      .send(responsiblePayload());

    const loginEmail = reg2.body.data.user.email_account;
    await request(app).post('/api/v1/auth/associate/logout').set('Cookie', c2);

    const login = await request(app)
      .post('/api/v1/auth/associate/login')
      .send({ email: loginEmail, password: 'senha123' });
    assert.equal(login.status, 200);
    assert.ok(extractAssociateCookie(login.headers['set-cookie']));

    const forgot = await request(app)
      .post('/api/v1/auth/associate/forgot-password')
      .send({ email: loginEmail });
    assert.equal(forgot.status, 200);
    assert.ok(forgot.body.data.reset_token);

    const reset = await request(app)
      .post('/api/v1/auth/associate/reset-password')
      .send({ token: forgot.body.data.reset_token, password: 'novaSenha1' });
    assert.equal(reset.status, 200);

    const loginNew = await request(app)
      .post('/api/v1/auth/associate/login')
      .send({ email: loginEmail, password: 'novaSenha1' });
    assert.equal(loginNew.status, 200);

    // ACCOUNT_EXISTS when Associado
    await query(`UPDATE users SET status = 'Associado' WHERE email_account = $1`, [email]);
    const existsConflict = await request(app)
      .post('/api/v1/auth/associate/register-email')
      .send({ email, password: 'senha12345' });
    assert.equal(existsConflict.status, 409);
    assert.equal(existsConflict.body.errors[0].code, 'ACCOUNT_EXISTS');
  });

  it('PATCH /users/me saves only valid fields', async () => {
    const reg = await request(app)
      .post('/api/v1/auth/associate/register-email')
      .send({ email: `patch-${Date.now()}@test.local`, password: 'senha12345' });
    const cookie = extractAssociateCookie(reg.headers['set-cookie']);

    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Cookie', cookie)
      .send({
        associate_name: 'Ana',
        associate_cpf: '000',
        cep: '',
      });
    assert.equal(res.status, 200);
    assert.ok(res.body.meta.saved_fields.includes('associate_name'));
    assert.ok(res.body.meta.invalid_fields.includes('associate_cpf'));
    assert.equal(res.body.data.associate_name, 'Ana');
  });

  it('patients: create parcial → patch → list', async () => {
    const reg = await request(app)
      .post('/api/v1/auth/associate/register-email')
      .send({ email: `pat-${Date.now()}@test.local`, password: 'senha12345' });
    const cookie = extractAssociateCookie(reg.headers['set-cookie']);
    await request(app)
      .patch('/api/v1/users/me')
      .set('Cookie', cookie)
      .send(responsiblePayload({ responsible_type: 'another' }));

    const created = await request(app)
      .post('/api/v1/users/me/patients')
      .set('Cookie', cookie)
      .send({ associate_name: 'João' });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.status, 'patient');
    const patientId = created.body.data.id;

    const patched = await request(app)
      .patch(`/api/v1/users/me/patients/${patientId}`)
      .set('Cookie', cookie)
      .send({
        associate_last_name: 'Souza',
        associate_birth_date: '2010-05-01',
        gender: 'homem-cis',
        nationality: 'Brasileira',
        associate_cpf: VALID_CPF,
        associate_rg: '7654321',
        associate_rg_issuer: 'SSP/SP',
        ciap_codes: ['N01'],
        reason_treatment_text: 'Cefaleia',
      });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.data.associate_last_name, 'Souza');

    const list = await request(app).get('/api/v1/users/me/patients').set('Cookie', cookie);
    assert.equal(list.status, 200);
    assert.equal(list.body.data.length, 1);
  });

  it('files + documents/status: RG incomplete vs complete; CNH', async () => {
    const reg = await request(app)
      .post('/api/v1/auth/associate/register-email')
      .send({ email: `docs-${Date.now()}@test.local`, password: 'senha12345' });
    const cookie = extractAssociateCookie(reg.headers['set-cookie']);
    await request(app)
      .patch('/api/v1/users/me')
      .set('Cookie', cookie)
      .send(responsiblePayload());
    await request(app).post('/api/v1/users/me/advance').set('Cookie', cookie);
    // may already be phase 2 from patch; advance to 3
    let me = await request(app).get('/api/v1/auth/associate/me').set('Cookie', cookie);
    while (me.body.data.user.associate_status < 3) {
      const adv = await request(app).post('/api/v1/users/me/advance').set('Cookie', cookie);
      assert.ok([200, 400].includes(adv.status));
      if (adv.status !== 200) break;
      me = await request(app).get('/api/v1/auth/associate/me').set('Cookie', cookie);
    }
    assert.equal(me.body.data.user.associate_status, 3);

    const incomplete = await request(app)
      .get('/api/v1/users/me/documents/status')
      .set('Cookie', cookie);
    assert.equal(incomplete.status, 200);
    assert.equal(incomplete.body.data.complete, false);

    await request(app)
      .post('/api/v1/files')
      .set('Cookie', cookie)
      .field('doc_type', 'rg')
      .field('side', 'front')
      .field('subject', 'responsible')
      .field('doc_kind', 'identity')
      .attach('file', Buffer.from('front'), 'rg-front.jpg');

    const mid = await request(app).get('/api/v1/users/me/documents/status').set('Cookie', cookie);
    assert.equal(mid.body.data.complete, false);

    await request(app)
      .post('/api/v1/files')
      .set('Cookie', cookie)
      .field('doc_type', 'rg')
      .field('side', 'back')
      .field('subject', 'responsible')
      .field('doc_kind', 'identity')
      .attach('file', Buffer.from('back'), 'rg-back.jpg');

    const done = await request(app).get('/api/v1/users/me/documents/status').set('Cookie', cookie);
    assert.equal(done.body.data.complete, true);
    assert.equal(done.body.data.responsible.mode, 'rg');

    // CNH path on fresh user
    const reg2 = await request(app)
      .post('/api/v1/auth/associate/register-email')
      .send({ email: `cnh-${Date.now()}@test.local`, password: 'senha12345' });
    const c2 = extractAssociateCookie(reg2.headers['set-cookie']);
    await request(app).patch('/api/v1/users/me').set('Cookie', c2).send(responsiblePayload());
    let me2 = await request(app).get('/api/v1/auth/associate/me').set('Cookie', c2);
    while (me2.body.data.user.associate_status < 3) {
      await request(app).post('/api/v1/users/me/advance').set('Cookie', c2);
      me2 = await request(app).get('/api/v1/auth/associate/me').set('Cookie', c2);
    }
    await request(app)
      .post('/api/v1/files')
      .set('Cookie', c2)
      .field('doc_type', 'cnh')
      .field('side', 'front')
      .field('subject', 'responsible')
      .field('doc_kind', 'identity')
      .attach('file', Buffer.from('cnh'), 'cnh.jpg');
    const cnhStatus = await request(app).get('/api/v1/users/me/documents/status').set('Cookie', c2);
    assert.equal(cnhStatus.body.data.complete, true);
    assert.equal(cnhStatus.body.data.responsible.mode, 'cnh');
  });

  it('advance 3→4 with docs; block without; phase 4 no 5 without bypass; terms stub; complete with bypass', async () => {
    const reg = await request(app)
      .post('/api/v1/auth/associate/register-email')
      .send({ email: `adv-${Date.now()}@test.local`, password: 'senha12345' });
    const cookie = extractAssociateCookie(reg.headers['set-cookie']);
    await request(app).patch('/api/v1/users/me').set('Cookie', cookie).send(responsiblePayload());

    let me = await request(app).get('/api/v1/auth/associate/me').set('Cookie', cookie);
    while (me.body.data.user.associate_status < 3) {
      const adv = await request(app).post('/api/v1/users/me/advance').set('Cookie', cookie);
      assert.equal(adv.status, 200);
      me = await request(app).get('/api/v1/auth/associate/me').set('Cookie', cookie);
    }

    const blocked = await request(app).post('/api/v1/users/me/advance').set('Cookie', cookie);
    assert.equal(blocked.status, 400);

    await request(app)
      .post('/api/v1/files')
      .set('Cookie', cookie)
      .field('doc_type', 'cnh')
      .field('side', 'front')
      .field('subject', 'responsible')
      .field('doc_kind', 'identity')
      .attach('file', Buffer.from('cnh'), 'cnh.jpg');

    const to4 = await request(app).post('/api/v1/users/me/advance').set('Cookie', cookie);
    assert.equal(to4.status, 200);
    assert.equal(to4.body.data.associate_status, 4);

    const terms = await request(app).get('/api/v1/terms/status');
    assert.equal(terms.status, 501);
    assert.equal(terms.body.errors[0].code, 'TERMS_MODULE_IN_DEVELOPMENT');

    const contracts = await request(app).post('/api/v1/terms/contracts').send({});
    assert.equal(contracts.status, 501);
    assert.equal(contracts.body.errors[0].code, 'TERMS_MODULE_IN_DEVELOPMENT');

    const noBypass = await request(app).post('/api/v1/users/me/advance').set('Cookie', cookie);
    assert.equal(noBypass.status, 501);
    assert.equal(noBypass.body.errors[0].code, 'TERMS_MODULE_IN_DEVELOPMENT');

    // Force phase 5 for complete test (QA path)
    await query(
      `UPDATE users SET associate_status = 5 WHERE email_account = $1`,
      [reg.body.data.user.email_account]
    );
    const done = await request(app).post('/api/v1/users/me/complete').set('Cookie', cookie);
    assert.equal(done.status, 200);
    assert.equal(done.body.data.status, 'Associado');
  });

  it('guards: operator cookie cannot use associate routes; associate cannot use operator users list', async () => {
    const { cookie: opCookie } = await loginAsAdmin();
    const denied = await request(app).get('/api/v1/auth/associate/me').set('Cookie', opCookie);
    assert.equal(denied.status, 401);

    const reg = await request(app)
      .post('/api/v1/auth/associate/register-email')
      .send({ email: `guard-${Date.now()}@test.local`, password: 'senha12345' });
    const assocCookie = extractAssociateCookie(reg.headers['set-cookie']);
    const usersList = await request(app).get('/api/v1/users').set('Cookie', assocCookie);
    assert.equal(usersList.status, 401);

    // exists public
    const exists = await request(app).get('/api/v1/users/exists').query({ email: reg.body.data.user.email_account });
    assert.equal(exists.status, 200);
    assert.equal(exists.body.data.state, 'in_progress');
  });

  it('TERMS_DEV_BYPASS allows 4→5 when enabled', async () => {
    const prev = env.termsDevBypass;
    env.termsDevBypass = true;
    try {
      const reg = await request(app)
        .post('/api/v1/auth/associate/register-email')
        .send({ email: `bypass-${Date.now()}@test.local`, password: 'senha12345' });
      const cookie = extractAssociateCookie(reg.headers['set-cookie']);
      await request(app).patch('/api/v1/users/me').set('Cookie', cookie).send(responsiblePayload());
      let me = await request(app).get('/api/v1/auth/associate/me').set('Cookie', cookie);
      while (me.body.data.user.associate_status < 3) {
        await request(app).post('/api/v1/users/me/advance').set('Cookie', cookie);
        me = await request(app).get('/api/v1/auth/associate/me').set('Cookie', cookie);
      }
      await request(app)
        .post('/api/v1/files')
        .set('Cookie', cookie)
        .field('doc_type', 'cnh')
        .field('side', 'front')
        .field('subject', 'responsible')
        .field('doc_kind', 'identity')
        .attach('file', Buffer.from('cnh'), 'cnh.jpg');
      await request(app).post('/api/v1/users/me/advance').set('Cookie', cookie);
      const to5 = await request(app).post('/api/v1/users/me/advance').set('Cookie', cookie);
      assert.equal(to5.status, 200);
      assert.equal(to5.body.data.associate_status, 5);
    } finally {
      env.termsDevBypass = prev;
    }
  });
});
