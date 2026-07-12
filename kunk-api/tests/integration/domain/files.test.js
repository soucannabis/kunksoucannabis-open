'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { loginAsAdmin } = require('../../helpers/auth');
const { v4: uuidv4 } = require('uuid');

describe('domain/files', () => {
  let app;
  let cookie;

  before(async () => {
    const session = await loginAsAdmin();
    app = session.app;
    cookie = session.cookie;
  });

  it('upload get download attach detach delete', async () => {
    const upload = await request(app)
      .post('/api/v1/files')
      .set('Cookie', cookie)
      .attach('file', Buffer.from('hello'), 'hello.txt');
    assert.equal(upload.status, 201, JSON.stringify(upload.body));
    const id = upload.body.data.id;

    const meta = await request(app).get(`/api/v1/files/${id}`).set('Cookie', cookie);
    assert.equal(meta.status, 200);

    const dl = await request(app).get(`/api/v1/files/${id}/download`).set('Cookie', cookie);
    assert.equal(dl.status, 200);

    const user = await request(app)
      .post('/api/v1/items/users')
      .set('Cookie', cookie)
      .send({ associate_name: 'F', user_code: uuidv4() });
    assert.equal(user.status, 201);

    const attach = await request(app)
      .post(`/api/v1/files/${id}/attach`)
      .set('Cookie', cookie)
      .send({ collection: 'users', item_id: user.body.data.id });
    assert.equal(attach.status, 201);

    const detach = await request(app)
      .delete(`/api/v1/files/${id}/attach`)
      .set('Cookie', cookie)
      .send({ collection: 'users', item_id: user.body.data.id });
    assert.equal(detach.status, 200);

    const del = await request(app).delete(`/api/v1/files/${id}`).set('Cookie', cookie);
    assert.equal(del.status, 200);
  });

  it('operator upload with user_id + doc_kind and list by user', async () => {
    const user = await request(app)
      .post('/api/v1/items/users')
      .set('Cookie', cookie)
      .send({ associate_name: 'Rx', associate_last_name: 'Test', user_code: uuidv4() });
    assert.equal(user.status, 201, JSON.stringify(user.body));
    const userId = user.body.data.id;

    const upload = await request(app)
      .post('/api/v1/files')
      .set('Cookie', cookie)
      .field('user_id', String(userId))
      .field('doc_kind', 'prescription')
      .field('filename', `receita-Rx-Test-${user.body.data.user_code}.pdf`)
      .attach('file', Buffer.from('%PDF-1.4'), 'scan.pdf');
    assert.equal(upload.status, 201, JSON.stringify(upload.body));
    assert.equal(upload.body.data.doc_kind, 'prescription');

    const listed = await request(app)
      .get(`/api/v1/files?user_id=${userId}&doc_kind=prescription`)
      .set('Cookie', cookie);
    assert.equal(listed.status, 200, JSON.stringify(listed.body));
    assert.ok((listed.body.data || []).some((f) => f.id === upload.body.data.id));

    await request(app).delete(`/api/v1/files/${upload.body.data.id}`).set('Cookie', cookie);
  });
});
