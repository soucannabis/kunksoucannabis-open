'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { loginAsAdmin } = require('../../helpers/auth');
const { env } = require('../../../src/config/env');
const storeFreight = require('../../../src/services/storeFreightConfig');

describe('freight/quote-config', () => {
  let app;
  let cookie;

  before(async () => {
    const session = await loginAsAdmin();
    app = session.app;
    cookie = session.cookie;
  });

  it('returns FREIGHT_NO_QUOTE when no providers enabled', async () => {
    assert.equal(env.modules.loggi, false);
    assert.equal(env.modules.melhorenvio, false);
    const res = await request(app)
      .post('/api/v1/freight/quote')
      .set('Cookie', cookie)
      .send({ address: { cep: '74000000', street: 'Rua', number: '1', city: 'Goiânia', state: 'GO' } });
    assert.equal(res.status, 400);
    assert.equal(res.body.errors[0].code, 'FREIGHT_NO_QUOTE');
  });

  it('CONFIG_INCOMPLETE when module on but store package missing', async () => {
    const previous = env.modules.loggi;
    env.modules.loggi = true;
    // Force incomplete store by stubbing getStoreFreightConfig
    const original = storeFreight.getStoreFreightConfig;
    storeFreight.getStoreFreightConfig = async () => ({
      apply_to_total: true,
      ship_from: null,
      package: null,
      content_declaration: null,
      default_option: null,
      loggi_external_service_ids: null,
      melhorenvio_enabled_service_ids: null,
    });
    try {
      const res = await request(app)
        .post('/api/v1/freight/quote')
        .set('Cookie', cookie)
        .send({
          address: {
            cep: '74000000',
            street: 'Rua',
            number: '1',
            city: 'Goiânia',
            state: 'GO',
          },
        });
      assert.equal(res.status, 400);
      assert.equal(res.body.errors[0].code, 'CONFIG_INCOMPLETE');
    } finally {
      env.modules.loggi = previous;
      storeFreight.getStoreFreightConfig = original;
    }
  });
});
