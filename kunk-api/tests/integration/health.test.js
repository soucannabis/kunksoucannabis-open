'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { getApp } = require('../helpers/app');
const { loginAsAdmin } = require('../helpers/auth');

describe('health', () => {
  it('GET /api/v1/health returns envelope', async () => {
    const app = getApp();
    const res = await request(app).get('/api/v1/health');
    assert.ok([200, 503].includes(res.status));
    assert.ok('data' in res.body);
    assert.ok('errors' in res.body);
    if (res.status === 200) {
      assert.equal(res.body.data.ok, true);
      assert.equal(res.body.data.db, 'up');
      assert.equal(res.body.errors, null);
    }
  });
});
