'use strict';

/**
 * Shared CRUD suite factory for /items/:collection
 */
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { loginAsAdmin } = require('./auth');
const { createPayload, patchPayload } = require('./fixtures/payloads');
const { v4: uuidv4 } = require('uuid');

function itemsCrudSuite(collection, options = {}) {
  describe(`items/${collection}`, () => {
    let app;
    let cookie;
    let createdId;

    before(async () => {
      const session = await loginAsAdmin();
      app = session.app;
      cookie = session.cookie;
    });

    it('rejects unknown collection', async () => {
      if (collection !== 'tags') return;
      const res = await request(app).get('/api/v1/items/not_a_table').set('Cookie', cookie);
      assert.equal(res.status, 404);
      assert.equal(res.body.errors[0].code, 'UNKNOWN_COLLECTION');
    });

    it('lists with envelope', async () => {
      const res = await request(app).get(`/api/v1/items/${collection}`).set('Cookie', cookie);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.equal(res.body.errors, null);
    });

    it('creates, gets, patches, deletes', async () => {
      if (options.skipWrite) return;

      let payload = createPayload(collection);

      if (collection === 'orders_files' || collection === 'users_files' || collection === 'services_files') {
        const fileRes = await request(app)
          .post('/api/v1/items/files')
          .set('Cookie', cookie)
          .send({ filename: 'j.txt', mime_type: 'text/plain', storage_path: '/tmp/j.txt' });
        assert.equal(fileRes.status, 201);
        const fileId = fileRes.body.data.id;

        if (collection === 'orders_files') {
          const order = await request(app)
            .post('/api/v1/items/orders')
            .set('Cookie', cookie)
            .send({ status: 'Novo', order_code: uuidv4() });
          assert.equal(order.status, 201);
          payload = { order_id: order.body.data.id, file_id: fileId };
        } else if (collection === 'users_files') {
          const user = await request(app)
            .post('/api/v1/items/users')
            .set('Cookie', cookie)
            .send({ associate_name: 'J', user_code: uuidv4() });
          assert.equal(user.status, 201);
          payload = { user_id: user.body.data.id, file_id: fileId };
        } else {
          const svc = await request(app)
            .post('/api/v1/items/services')
            .set('Cookie', cookie)
            .send({ name: 'J', service_code: uuidv4() });
          assert.equal(svc.status, 201);
          payload = { service_id: svc.body.data.id, file_id: fileId };
        }
      }

      const created = await request(app)
        .post(`/api/v1/items/${collection}`)
        .set('Cookie', cookie)
        .send(payload);
      assert.equal(created.status, 201, JSON.stringify(created.body));
      assert.ok(created.body.data.id);
      createdId = created.body.data.id;

      const sensitive = JSON.stringify(created.body.data);
      assert.ok(!sensitive.includes('"password"') || !created.body.data.password);
      assert.equal(created.body.data.session_token, undefined);
      assert.equal(created.body.data.account_password, undefined);
      assert.equal(created.body.data.token, undefined);

      const got = await request(app)
        .get(`/api/v1/items/${collection}/${createdId}`)
        .set('Cookie', cookie);
      assert.equal(got.status, 200);
      assert.equal(String(got.body.data.id), String(createdId));

      const patch = patchPayload(collection);
      if (Object.keys(patch).length && !options.skipPatch) {
        const updated = await request(app)
          .patch(`/api/v1/items/${collection}/${createdId}`)
          .set('Cookie', cookie)
          .send(patch);
        assert.equal(updated.status, 200, JSON.stringify(updated.body));
      }

      if (!options.skipDelete) {
        const deleted = await request(app)
          .delete(`/api/v1/items/${collection}/${createdId}`)
          .set('Cookie', cookie);
        assert.equal(deleted.status, 200);
      }
    });
  });
}

module.exports = { itemsCrudSuite };
