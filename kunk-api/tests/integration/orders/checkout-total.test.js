'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { loginAsAdmin } = require('../../helpers/auth');

describe('orders/checkout-total', () => {
  let app;
  let cookie;

  before(async () => {
    const session = await loginAsAdmin();
    app = session.app;
    cookie = session.cookie;
  });

  it('rejects TOTAL_MISMATCH when client total wrong', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Cookie', cookie)
      .send({
        status: 'Aguardando pagamento',
        associate_name: 'Teste',
        items: [{ amount: 50, quantity: 2 }],
        total: 10,
        delivery_price: 0,
        discount: 0,
        donation: 0,
      });
    assert.equal(res.status, 400);
    assert.equal(res.body.errors[0].code, 'TOTAL_MISMATCH');
  });

  it('creates when total matches amount×quantity', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Cookie', cookie)
      .send({
        status: 'Aguardando pagamento',
        associate_name: 'Teste',
        items: [{ amount: 50, quantity: 2 }],
        total: 100,
        delivery_price: 0,
      });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.data.total, 100);
  });
});
