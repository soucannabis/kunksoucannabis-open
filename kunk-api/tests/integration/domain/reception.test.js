'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { loginAsAdmin } = require('../../helpers/auth');

describe('domain/reception', () => {
  let app;
  let cookie;

  before(async () => {
    const session = await loginAsAdmin();
    app = session.app;
    cookie = session.cookie;
  });

  it('form-schema is public', async () => {
    const res = await request(app).get('/api/v1/reception/form-schema');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.enabled, true);
    assert.ok(Array.isArray(res.body.data.fields));
    assert.ok(Array.isArray(res.body.data.statuses));
  });

  it('public create + status + complete done', async () => {
    const created = await request(app)
      .post('/api/v1/reception/public')
      .send({
        name: 'Triagem',
        last_name: 'Teste',
        email: `triagem-${Date.now()}@example.com`,
        phone: '11999999999',
        message: 'preciso de acolhimento',
      });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.status, 'waiting');
    const id = created.body.data.id;

    const counts = await request(app)
      .get('/api/v1/reception/status-counts')
      .set('Cookie', cookie);
    assert.equal(counts.status, 200);
    assert.ok((counts.body.data.waiting || 0) >= 1);

    const status = await request(app)
      .patch(`/api/v1/reception/${id}/status`)
      .set('Cookie', cookie)
      .send({ status: 'waiting' });
    assert.equal(status.status, 200);

    const done = await request(app)
      .patch(`/api/v1/reception/${id}/complete`)
      .set('Cookie', cookie)
      .send({ completion_reason: 'Pedido' });
    assert.equal(done.status, 200);
    assert.equal(done.body.data.status, 'done');
  });

  it('create attendant complete', async () => {
    const created = await request(app)
      .post('/api/v1/reception')
      .set('Cookie', cookie)
      .send({ name: 'Rec', last_name: 'T' });
    assert.equal(created.status, 201);
    const id = created.body.data.id;

    const att = await request(app)
      .patch(`/api/v1/reception/${id}/attendant`)
      .set('Cookie', cookie)
      .send({ attendant: 'admin' });
    assert.equal(att.status, 200);

    const done = await request(app)
      .patch(`/api/v1/reception/${id}/complete`)
      .set('Cookie', cookie)
      .send({ completion_reason: 'ok' });
    assert.equal(done.status, 200);
    assert.equal(done.body.data.status, 'done');
  });
});
