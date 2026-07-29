'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { loginAsAdmin } = require('../../helpers/auth');
const { v4: uuidv4 } = require('uuid');

describe('domain/users', () => {
  let app;
  let cookie;
  let userId;
  let userCode;

  before(async () => {
    const session = await loginAsAdmin();
    app = session.app;
    cookie = session.cookie;
  });

  it('creates user via domain', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Cookie', cookie)
      .send({ associate_name: 'Dom', associate_last_name: 'User', email_account: `dom${Date.now()}@t.com` });
    assert.equal(res.status, 201);
    userId = res.body.data.id;
    userCode = res.body.data.user_code;
  });

  it('list with patients and by-code', async () => {
    const listed = await request(app)
      .get('/api/v1/users')
      .query({ patients: '', limit: 5 })
      .set('Cookie', cookie);
    assert.equal(listed.status, 200, JSON.stringify(listed.body));
    assert.ok(Array.isArray(listed.body.data));
    assert.ok(Array.isArray(listed.body.data[0]?.patients));

    const s = await request(app).get('/api/v1/users/search').query({ q: 'Dom' }).set('Cookie', cookie);
    assert.equal(s.status, 200);
    const b = await request(app)
      .get(`/api/v1/users/by-code/${userCode}`)
      .query({ patients: '' })
      .set('Cookie', cookie);
    assert.equal(b.status, 200);
    assert.ok(Array.isArray(b.body.data.patients));
  });

  it('nests patients via responsible_code and include=responsible', async () => {
    const patient = await request(app)
      .post('/api/v1/users')
      .set('Cookie', cookie)
      .send({
        associate_name: 'Pac',
        associate_last_name: 'Link',
        email_account: `pac${Date.now()}@t.com`,
        responsible_code: userCode,
      });
    assert.equal(patient.status, 201, JSON.stringify(patient.body));
    assert.equal(patient.body.data.responsible_code, userCode);

    const withPatients = await request(app)
      .get(`/api/v1/users/by-code/${userCode}`)
      .query({ patients: '' })
      .set('Cookie', cookie);
    assert.equal(withPatients.status, 200);
    assert.ok(
      withPatients.body.data.patients.some((p) => p.id === patient.body.data.id),
      'patient should appear under associate'
    );

    const withResponsible = await request(app)
      .get(`/api/v1/users/by-code/${patient.body.data.user_code}`)
      .query({ include: 'responsible', patients: '' })
      .set('Cookie', cookie);
    assert.equal(withResponsible.status, 200, JSON.stringify(withResponsible.body));
    assert.equal(withResponsible.body.data.responsible?.user_code, userCode);
    assert.deepEqual(withResponsible.body.data.patients, []);
  });

  it('patch handbook patients', async () => {
    const h = await request(app)
      .post(`/api/v1/users/${userId}/handbook`)
      .set('Cookie', cookie)
      .send({ handbook: 'ok' });
    assert.equal(h.status, 200);
    const p = await request(app).get(`/api/v1/users/${userId}/patients`).set('Cookie', cookie);
    assert.equal(p.status, 200);
    assert.ok(Array.isArray(p.body.data));
    const u = await request(app)
      .patch(`/api/v1/users/${userId}`)
      .set('Cookie', cookie)
      .send({ annotations: 'x' });
    assert.equal(u.status, 200);
  });
});
