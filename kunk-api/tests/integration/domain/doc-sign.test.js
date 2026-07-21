'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { getApp } = require('../../helpers/app');
const { query, ensureAdminUser, cleanupTestLocalUsers } = require('../../helpers/db');
const { loginAsAdmin } = require('../../helpers/auth');

describe('doc-sign integration', () => {
  let app;

  before(async () => {
    app = getApp();
    await ensureAdminUser();
    await cleanupTestLocalUsers();
  });

  it('publish templates, create contract, sign and advance phase', async () => {
    const { cookie: adminCookie } = await loginAsAdmin();

    for (const kind of ['self', 'with_patient']) {
      const tpl = await request(app)
        .get(`/api/v1/doc-sign/templates/${kind}`)
        .set('Cookie', adminCookie);
      assert.equal(tpl.status, 200);
      assert.ok(tpl.body.data.draft_content_json);

      const pub = await request(app)
        .post(`/api/v1/doc-sign/templates/${kind}/publish`)
        .set('Cookie', adminCookie)
        .send({ notes: 'test publish' });
      assert.equal(pub.status, 201, JSON.stringify(pub.body));
      assert.ok(pub.body.data.version?.pdf_file_id);
    }

    const email = `docsign-${Date.now()}@test.local`;
    const password = 'TestPass123!';
    const reg = await request(app)
      .post('/api/v1/auth/associate/register-email')
      .send({ email, password });
    assert.equal(reg.status, 201);
    const cookie = reg.headers['set-cookie'];
    const userCode = reg.body.data.user.user_code;

    await query(
      `UPDATE users SET
         associate_status = 'assinatura_termo',
         associate_name = 'Paulo',
         associate_last_name = 'Teste',
         associate_cpf = '123.456.789-00',
         associate_rg = '123',
         associate_rg_issuer = 'SSP',
         nationality = 'brasileiro(a)',
         marital_status = 'Solteiro',
         street = 'Rua A',
         street_number = '10',
         city = 'Anápolis',
         neighborhood = 'Centro',
         state = 'GO',
         cep = '75000-000',
         responsible_type = 'himself'
       WHERE user_code = $1`,
      [userCode]
    );

    const created = await request(app)
      .post('/api/v1/doc-sign/contracts')
      .set('Cookie', cookie)
      .send({});
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.data.status, 'pending');
    assert.ok(created.body.data.signing_url);
    const token = created.body.data.signing_url.split('/assinar/')[1];

    const list = await request(app)
      .get('/api/v1/doc-sign/contracts')
      .set('Cookie', adminCookie);
    assert.equal(list.status, 200, JSON.stringify(list.body));
    assert.ok((list.body.data || []).some((c) => c.id === created.body.data.id));

    const signPayload = await request(app).get(`/api/v1/doc-sign/sign/${token}`);
    assert.equal(signPayload.status, 200, JSON.stringify(signPayload.body));
    assert.ok(signPayload.body.data.content_json);
    assert.equal(signPayload.body.data.content_json.type, 'doc');
    assert.ok(signPayload.body.data.title);

    const view = await request(app)
      .post(`/api/v1/doc-sign/sign/${token}/view`)
      .send({ timezone: 'America/Sao_Paulo' });
    assert.equal(view.status, 200);

    const png =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    const complete = await request(app)
      .post(`/api/v1/doc-sign/sign/${token}/complete`)
      .send({
        method: 'draw',
        signature_image_base64: png,
        consent: true,
        timezone: 'America/Sao_Paulo',
      });
    assert.equal(complete.status, 200, JSON.stringify(complete.body));
    assert.equal(complete.body.data.status, 'completed');

    const me = await request(app).get('/api/v1/auth/associate/me').set('Cookie', cookie);
    assert.equal(me.status, 200);
    assert.equal(me.body.data.user.associate_status, 'assinatura_termo');
    assert.equal(me.body.data.user.status, 'Associado');
    assert.ok(me.body.data.user.adhesion_term);

    const again = await request(app)
      .post('/api/v1/doc-sign/contracts')
      .set('Cookie', cookie)
      .send({});
    assert.equal(again.status, 409);
    assert.equal(again.body.errors[0].code, 'CONTRACT_ALREADY_COMPLETED');

    const staffAgain = await request(app)
      .post('/api/v1/doc-sign/contracts')
      .set('Cookie', adminCookie)
      .send({ user_code: userCode, regenerate: true });
    assert.equal(staffAgain.status, 409);

    await cleanupTestLocalUsers();
  });
});
