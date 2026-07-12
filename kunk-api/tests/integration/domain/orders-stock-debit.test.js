'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { loginAsAdmin } = require('../../helpers/auth');
const { query } = require('../../helpers/db');
const { v4: uuidv4 } = require('uuid');

const ADDRESS = {
  street: 'Rua Debito Estoque',
  street_number: '75',
  neighborhood: 'Centro',
  city: 'São Paulo',
  state: 'SP',
  cep: '01001000',
};

describe('domain/orders stock debit on payment', () => {
  let app;
  let cookie;
  let productId;
  let sku;

  before(async () => {
    const session = await loginAsAdmin();
    app = session.app;
    cookie = session.cookie;
    sku = `DEB-${uuidv4().slice(0, 8)}`;

    const created = await request(app)
      .post('/api/v1/items/products')
      .set('Cookie', cookie)
      .send({
        status: 'published',
        name: `Produto Debito ${sku}`,
        sku,
        type: 'oil',
        unit: 'ml',
        price: 40,
        amount: 15,
        category: 'test',
      });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    productId = created.body.data.id;
  });

  it('debits product.amount and writes sale movement when status → Pagamento concluído', async () => {
    const before = await query(`SELECT amount FROM products WHERE id = $1`, [productId]);
    assert.equal(Number(before.rows[0].amount), 15);

    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Cookie', cookie)
      .send({
        associate_name: 'Cliente Debito',
        user_code: uuidv4(),
        status: 'Aguardando pagamento',
        items: [
          {
            product_id: productId,
            code: sku,
            name: `Produto Debito ${sku}`,
            amount: 40,
            quantity: 3,
          },
        ],
        total: 120,
        delivery_price: 0,
        discount: 0,
        donation: 0,
        address: ADDRESS,
      });
    assert.equal(orderRes.status, 201, JSON.stringify(orderRes.body));
    const orderId = orderRes.body.data.id;
    assert.equal(orderRes.body.data.stock_debited_at, null);
    assert.equal(orderRes.body.data.items[0].stock_at_order, 15);

    const paid = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Cookie', cookie)
      .send({ status: 'Pagamento concluído' });
    assert.equal(paid.status, 200, JSON.stringify(paid.body));
    assert.ok(paid.body.data.stock_debited_at, 'stock_debited_at deve ser preenchido');
    assert.equal(paid.body.data.status, 'Pagamento concluído');

    const after = await query(`SELECT amount FROM products WHERE id = $1`, [productId]);
    assert.equal(
      Number(after.rows[0].amount),
      12,
      'estoque deve cair 15 → 12 após pagamento de 3 unidades'
    );

    const movements = await query(
      `SELECT product_id, order_id, quantity, kind FROM product_stock_movements
       WHERE order_id = $1 AND kind = 'sale' ORDER BY id`,
      [orderId]
    );
    assert.equal(movements.rows.length, 1);
    assert.equal(Number(movements.rows[0].product_id), productId);
    assert.equal(Number(movements.rows[0].quantity), -3);

    const apiMov = await request(app)
      .get(`/api/v1/products/${productId}/movements`)
      .set('Cookie', cookie);
    assert.equal(apiMov.status, 200, JSON.stringify(apiMov.body));
    const sale = (apiMov.body.data.movements || []).find(
      (m) => Number(m.order_id) === orderId && m.kind === 'sale'
    );
    assert.ok(sale, 'histórico do produto deve listar a venda do pedido');
    assert.equal(Number(sale.quantity), -3);

    // Idempotência: marcar pago de novo não debita outra vez
    const paidAgain = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Cookie', cookie)
      .send({ status: 'Pagamento concluído' });
    assert.equal(paidAgain.status, 200, JSON.stringify(paidAgain.body));
    const afterIdem = await query(`SELECT amount FROM products WHERE id = $1`, [productId]);
    assert.equal(Number(afterIdem.rows[0].amount), 12);

    const movCount = await query(
      `SELECT COUNT(*)::int AS c FROM product_stock_movements WHERE order_id = $1 AND kind = 'sale'`,
      [orderId]
    );
    assert.equal(movCount.rows[0].c, 1);
  });

  it('resolves product by sku when product_id is missing and still debits', async () => {
    await query(`UPDATE products SET amount = 10 WHERE id = $1`, [productId]);

    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Cookie', cookie)
      .send({
        associate_name: 'Cliente Debito SKU',
        user_code: uuidv4(),
        status: 'Aguardando pagamento',
        items: [
          {
            code: sku,
            name: `Produto Debito ${sku}`,
            amount: 40,
            quantity: 2,
          },
        ],
        total: 80,
        delivery_price: 0,
        discount: 0,
        donation: 0,
        address: ADDRESS,
      });
    assert.equal(orderRes.status, 201, JSON.stringify(orderRes.body));

    const paid = await request(app)
      .patch(`/api/v1/orders/${orderRes.body.data.id}/status`)
      .set('Cookie', cookie)
      .send({ status: 'Pagamento concluído' });
    assert.equal(paid.status, 200, JSON.stringify(paid.body));
    assert.ok(paid.body.data.stock_debited_at);

    const after = await query(`SELECT amount FROM products WHERE id = $1`, [productId]);
    assert.equal(Number(after.rows[0].amount), 8);
  });
});
