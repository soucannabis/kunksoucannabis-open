'use strict';

const { query } = require('../../db/pool');
const orderStatuses = require('../orderStatusesService');
const ordersService = require('../ordersService');
const itemsRepository = require('../../repositories/itemsRepository');
const credentialsService = require('../credentialsService');

function extractPaidPayload(hook) {
  const root = hook?.data || hook || {};
  // v5 webhook shapes vary: type at top or nested
  const type = hook?.type || root.type || hook?.data?.type || '';
  const data = root.data || root;
  const code =
    data.code ||
    data?.order?.code ||
    (Array.isArray(data) ? data[0]?.code : null) ||
    hook?.data?.data?.[0]?.code ||
    null;
  const charge = data.charges?.[0] || hook?.data?.charges?.[0] || null;
  const paymentMethod =
    charge?.payment_method ||
    charge?.last_transaction?.transaction_type ||
    data.payment_method ||
    null;
  const orderId = data.id || data.order_id || null;
  const chargeIds = (data.charges || []).map((c) => c.id).filter(Boolean);
  return { type: String(type), code: code ? String(code) : null, paymentMethod, orderId, chargeIds, raw: hook };
}

async function verifyBasicAuth(req) {
  const creds = await credentialsService.resolveAll('pagarme');
  const user = String(creds.webhook_user || '').trim();
  const pass = String(creds.webhook_pass || '').trim();
  if (!user && !pass) return true;
  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const sep = decoded.indexOf(':');
  if (sep < 0) return false;
  const u = decoded.slice(0, sep);
  const p = decoded.slice(sep + 1);
  return u === user && p === pass;
}

/** Diagnóstico seguro (não revela senha). */
async function basicAuthDebug(req) {
  const creds = await credentialsService.resolveAll('pagarme');
  const expectedUser = String(creds.webhook_user || '').trim();
  const expectedPass = String(creds.webhook_pass || '').trim();
  const header = req.headers.authorization || '';
  if (!expectedUser && !expectedPass) {
    return { configured: false, header_present: Boolean(header) };
  }
  if (!header.startsWith('Basic ')) {
    return {
      configured: true,
      expected_user: expectedUser,
      header_present: Boolean(header),
      header_is_basic: false,
    };
  }
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const sep = decoded.indexOf(':');
  const receivedUser = sep >= 0 ? decoded.slice(0, sep) : decoded;
  return {
    configured: true,
    expected_user: expectedUser,
    received_user: receivedUser,
    user_match: receivedUser === expectedUser,
    pass_match:
      sep >= 0 && decoded.slice(sep + 1) === expectedPass,
  };
}

async function handleOrderPaid(hook) {
  const paid = extractPaidPayload(hook);
  const isPaidEvent =
    /order\.paid/i.test(paid.type) ||
    /charge\.paid/i.test(paid.type) ||
    String(hook?.data?.status || '').toLowerCase() === 'paid';
  if (!isPaidEvent && paid.type && !/paid/i.test(paid.type)) {
    return { handled: false, reason: 'ignored_event', type: paid.type };
  }
  if (!paid.code) {
    return { handled: false, reason: 'missing_code' };
  }

  const orderRes = await query(`SELECT * FROM orders WHERE order_code::text = $1 LIMIT 1`, [
    paid.code,
  ]);
  let order = orderRes.rows[0];
  if (!order) {
    // fallback: numeric id as code
    const byId = await query(`SELECT * FROM orders WHERE CAST(id AS text) = $1 LIMIT 1`, [paid.code]);
    order = byId.rows[0];
  }
  if (!order) {
    return { handled: false, reason: 'order_not_found', code: paid.code };
  }

  const statuses = await orderStatuses.getOrderStatuses();
  const paidStatus = orderStatuses.getPaidValue(statuses);

  if (paid.paymentMethod) {
    await itemsRepository.updateItem('orders', order.id, {
      payment_method: paid.paymentMethod,
    });
  }

  if (order.status !== paidStatus) {
    order = await ordersService.updateStatus(order.id, paidStatus, {
      source: 'pagarme_webhook',
      skipPaymentLock: true,
      external_payment_info: {
        provider: 'pagarme',
        paid_at: new Date().toISOString(),
        pagarme_order_id: paid.orderId,
        pagarme_charge_ids: paid.chargeIds,
        payment_method: paid.paymentMethod,
        local_order_code: paid.code,
        pagarme_raw: paid.raw?.data || paid.raw || null,
      },
    });
  } else {
    // already paid — still try sync
    try {
      const sc = require('../soucannabis_orders/syncOrders');
      await sc.createIfNeeded(order.id, {
        source: 'pagarme_webhook',
        external_payment_info: {
          provider: 'pagarme',
          paid_at: new Date().toISOString(),
          pagarme_order_id: paid.orderId,
          pagarme_charge_ids: paid.chargeIds,
          payment_method: paid.paymentMethod,
          local_order_code: paid.code,
        },
      });
    } catch {
      /* optional if module off */
    }
  }

  return { handled: true, order_id: order.id, code: paid.code };
}

async function handleServicePaid(hook) {
  const paid = extractPaidPayload(hook);
  if (!paid.code) return { handled: false, reason: 'missing_code' };

  const svcRes = await query(
    `SELECT * FROM services
     WHERE service_code::text = $1 OR booking_group_code::text = $1 OR CAST(id AS text) = $1
     LIMIT 1`,
    [paid.code]
  );
  const svc = svcRes.rows[0];
  if (!svc) return { handled: false, reason: 'service_not_found', code: paid.code };

  await itemsRepository.updateItem('services', svc.id, {
    status: 'Pagamento Concluído',
    payment_method: paid.paymentMethod || svc.payment_method,
    ...(paid.paymentMethod ? {} : {}),
  });
  return { handled: true, service_id: svc.id, code: paid.code };
}

module.exports = {
  extractPaidPayload,
  verifyBasicAuth,
  basicAuthDebug,
  handleOrderPaid,
  handleServicePaid,
};
