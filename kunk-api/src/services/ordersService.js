'use strict';

const { query } = require('../db/pool');
const itemsRepository = require('../repositories/itemsRepository');
const receptionService = require('./receptionService');
const storeFreight = require('./storeFreightConfig');
const orderStatuses = require('./orderStatusesService');
const { computeExpectedTotal } = require('./orderTotals');
const { AppError } = require('../utils/response');
const { v4: uuidv4 } = require('uuid');

const FORBIDDEN_CHECKOUT_FIELDS = [
  'coupon_id',
  'no_commission',
  'partner',
  'partner_code',
  'bvid',
];

function rejectForbidden(payload) {
  for (const key of FORBIDDEN_CHECKOUT_FIELDS) {
    if (payload[key] !== undefined && payload[key] !== null && payload[key] !== '') {
      throw new AppError(400, 'VALIDATION_ERROR', `Campo não suportado: ${key}`);
    }
  }
}

async function validateAndNormalizeCheckout(payload) {
  rejectForbidden(payload);

  const cfg = await storeFreight.getStoreFreightConfig();
  const breakdown = computeExpectedTotal({
    items: payload.items || [],
    delivery_price: payload.delivery_price,
    apply_to_total: cfg.apply_to_total,
    discount: payload.discount,
    donation: payload.donation,
    custom_payment: payload.custom_payment,
  });

  const clientTotal = payload.total;
  if (clientTotal !== undefined && clientTotal !== null) {
    if (Math.abs(Number(clientTotal) - breakdown.expected_total) > 0.01) {
      throw new AppError(
        400,
        'TOTAL_MISMATCH',
        `Total informado (${Number(clientTotal)}) diverge do calculado (${breakdown.expected_total})`,
        {
          client_total: Number(clientTotal),
          expected_total: breakdown.expected_total,
          breakdown,
        }
      );
    }
  }

  const {
    coupon_id,
    no_commission,
    partner,
    partner_code,
    bvid,
    email,
    associate_email,
    associate_code,
    name_associate,
    ...rest
  } = payload;

  return {
    body: {
      ...rest,
      associate_name: rest.associate_name || name_associate || rest.associate_name,
      total: breakdown.expected_total,
      discount: breakdown.discount,
      donation: breakdown.donation,
      delivery_price: Number(payload.delivery_price) || 0,
      freight_carrier: payload.freight_carrier || payload.freight_option?.provider || null,
      freight_option: payload.freight_option || null,
    },
    triage: {
      email: email || associate_email,
      associate_code: associate_code || payload.user_code,
    },
    breakdown,
  };
}

async function createOrder(payload, actor) {
  const { body, triage } = await validateAndNormalizeCheckout(payload || {});
  const orderBody = {
    ...body,
    order_code: body.order_code || uuidv4(),
    date_created: new Date().toISOString(),
    created_by_user_code: body.created_by_user_code || actor?.user_code || actor?.internal_code,
  };
  const order = await itemsRepository.createItem('orders', orderBody);
  try {
    await receptionService.completeOpenByAssociate({
      email: triage.email,
      associate_code: triage.associate_code,
      completion_reason: 'Pedido',
      actor,
    });
  } catch {
    /* non-blocking */
  }
  return order;
}

async function updateOrder(id, payload, actor) {
  const existing = await itemsRepository.getItem('orders', id);
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Pedido não encontrado');
  const merged = { ...existing, ...payload, id: existing.id };
  const { body } = await validateAndNormalizeCheckout(merged);
  return itemsRepository.updateItem('orders', id, {
    ...body,
    date_updated: new Date().toISOString(),
  });
}

function normalizeEndDate(endDate) {
  if (!endDate) return endDate;
  const s = String(endDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T23:59:59`;
  return s;
}

function parseTagsParam(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map((t) => String(t).trim()).filter(Boolean);
  return String(tags)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function resolveDateColumn(dateField) {
  return dateField === 'payment_date' ? 'payment_date' : 'date_created';
}

function buildListWhere(queryParams = {}) {
  const params = [];
  const parts = [];

  if (queryParams.status) {
    params.push(String(queryParams.status));
    parts.push(`status = $${params.length}`);
  }

  const dateCol = resolveDateColumn(queryParams.date_field);
  if (queryParams.date_from) {
    params.push(String(queryParams.date_from));
    parts.push(`${dateCol} >= $${params.length}::timestamptz`);
  }
  if (queryParams.date_to) {
    params.push(normalizeEndDate(queryParams.date_to));
    parts.push(`${dateCol} <= $${params.length}::timestamptz`);
  }

  if (queryParams.created_by) {
    params.push(String(queryParams.created_by));
    parts.push(`created_by_user_code = $${params.length}`);
  }

  if (queryParams.q) {
    params.push(`%${String(queryParams.q).trim()}%`);
    const i = params.length;
    parts.push(
      `(associate_name ILIKE $${i} OR order_code::text ILIKE $${i} OR tracking_code ILIKE $${i} OR CAST(id AS text) ILIKE $${i} OR COALESCE(address::text, '') ILIKE $${i})`
    );
  }

  const tags = parseTagsParam(queryParams.tags);
  for (const tag of tags) {
    params.push(JSON.stringify([tag]));
    parts.push(`COALESCE(tags, '[]'::jsonb) @> $${params.length}::jsonb`);
  }

  const where = parts.length ? `WHERE ${parts.join(' AND ')}` : '';
  return { where, params };
}

async function listOrders(queryParams = {}) {
  const lim = Math.min(Math.max(Number(queryParams.limit) || 50, 1), 200);
  const off = Math.max(Number(queryParams.offset) || 0, 0);
  const { where, params } = buildListWhere(queryParams);
  const dateCol = resolveDateColumn(queryParams.date_field);

  const countResult = await query(`SELECT COUNT(*)::int AS total FROM orders ${where}`, params);
  const listParams = [...params, lim, off];
  const result = await query(
    `SELECT * FROM orders ${where}
     ORDER BY ${dateCol} DESC NULLS LAST, id DESC
     LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
    listParams
  );

  return {
    data: result.rows,
    meta: {
      filter_count: countResult.rows[0].total,
      total_count: countResult.rows[0].total,
      limit: lim,
      offset: off,
    },
  };
}

async function facets(queryParams = {}) {
  const { where, params } = buildListWhere({
    ...queryParams,
    status: undefined,
    tags: undefined,
  });

  const statusResult = await query(
    `SELECT COALESCE(NULLIF(TRIM(status), ''), 'Sem status') AS status, COUNT(*)::int AS count
     FROM orders ${where}
     GROUP BY 1
     ORDER BY count DESC`,
    params
  );

  const tagResult = await query(
    `SELECT tag, COUNT(*)::int AS count
     FROM (
       SELECT jsonb_array_elements_text(
         CASE
           WHEN jsonb_typeof(tags) = 'array' THEN tags
           ELSE '[]'::jsonb
         END
       ) AS tag
       FROM orders ${where}
     ) t
     WHERE tag IS NOT NULL AND TRIM(tag) <> ''
     GROUP BY tag
     ORDER BY count DESC
     LIMIT 100`,
    params
  );

  const statusCounts = {};
  for (const row of statusResult.rows) {
    statusCounts[row.status] = row.count;
  }
  const tagCounts = {};
  for (const row of tagResult.rows) {
    tagCounts[row.tag] = row.count;
  }

  return { statusCounts, tagCounts };
}

async function statusConfig() {
  const statuses = await orderStatuses.getOrderStatuses();
  return {
    statuses,
    awaiting: orderStatuses.getAwaitingValue(statuses),
    paid: orderStatuses.getPaidValue(statuses),
  };
}

async function updateStatus(id, status) {
  if (!status) throw new AppError(400, 'VALIDATION_ERROR', 'status é obrigatório');
  const statuses = await orderStatuses.getOrderStatuses();
  if (!orderStatuses.isAllowedStatus(status, statuses)) {
    throw new AppError(400, 'VALIDATION_ERROR', `Status não permitido: ${status}`);
  }

  const existing = await itemsRepository.getItem('orders', id);
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Pedido não encontrado');

  const awaiting = orderStatuses.getAwaitingValue(statuses);
  const paid = orderStatuses.getPaidValue(statuses);
  const patch = { status, date_updated: new Date().toISOString() };

  if (status === paid && existing.status === awaiting) {
    patch.payment_date = new Date().toISOString();
  } else if (status === awaiting && existing.status === paid) {
    patch.payment_date = null;
  }

  return itemsRepository.updateItem('orders', id, patch);
}

async function updateProduction(id, payload) {
  return itemsRepository.updateItem('orders', id, {
    production_owner: payload.production_owner,
    status: payload.status,
  });
}

async function registerPayment(id, payload) {
  return itemsRepository.updateItem('orders', id, {
    payment_link: payload.payment_link,
    payment_code: payload.payment_code,
    payment_method: payload.payment_method,
    payment_date: payload.payment_date || new Date().toISOString(),
  });
}

async function stats() {
  const byStatus = await query(
    `SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status ORDER BY count DESC`
  );
  return { by_status: byStatus.rows };
}

async function listByUser(userCode) {
  const result = await query(
    `SELECT * FROM orders WHERE user_code = $1 ORDER BY date_created DESC NULLS LAST LIMIT 100`,
    [userCode]
  );
  return result.rows;
}

async function deleteOrder(id) {
  return itemsRepository.deleteItem('orders', id);
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => (typeof t === 'string' ? t : t?.tag || t?.name || ''))
    .map((t) => String(t).trim())
    .filter(Boolean);
}

async function bulkAction(payload = {}) {
  const ids = Array.isArray(payload.ids) ? payload.ids.map(Number).filter(Boolean) : [];
  if (!ids.length) throw new AppError(400, 'VALIDATION_ERROR', 'ids é obrigatório');
  const action = String(payload.action || '');

  if (action === 'status') {
    const results = [];
    for (const id of ids) {
      try {
        const data = await updateStatus(id, payload.status);
        results.push({ order_id: id, ok: true, data });
      } catch (err) {
        results.push({ order_id: id, ok: false, error: err.message || String(err) });
      }
    }
    return { results };
  }

  if (action === 'tags_add' || action === 'tags_remove') {
    const addTags = normalizeTags(payload.tags);
    const results = [];
    for (const id of ids) {
      try {
        const order = await itemsRepository.getItem('orders', id);
        let tags = normalizeTags(order.tags);
        if (action === 'tags_add') {
          for (const t of addTags) {
            if (!tags.includes(t)) tags.push(t);
          }
        } else {
          tags = tags.filter((t) => !addTags.includes(t));
        }
        const data = await itemsRepository.updateItem('orders', id, { tags });
        results.push({ order_id: id, ok: true, data });
      } catch (err) {
        results.push({ order_id: id, ok: false, error: err.message || String(err) });
      }
    }
    return { results };
  }

  if (action === 'label_create' || action === 'label_cancel') {
    const provider = String(payload.provider || '').toLowerCase();
    if (!['loggi', 'melhorenvio'].includes(provider)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'provider deve ser loggi ou melhorenvio');
    }
    const loggiLabel = require('./loggi/label');
    const meLabel = require('./melhorenvio/label');
    const results = [];
    for (const id of ids) {
      try {
        const order = await itemsRepository.getItem('orders', id);
        let data;
        if (action === 'label_create') {
          const body = {
            order_id: id,
            order_code: order.order_code,
            address: order.address,
            name_associate: order.associate_name,
            freight_option: order.freight_option,
            user: { name: order.associate_name },
          };
          data =
            provider === 'loggi'
              ? await loggiLabel.createLabel(body)
              : await meLabel.createLabel(body);
        } else {
          data =
            provider === 'loggi'
              ? await loggiLabel.cancelPackage({
                  orderId: id,
                  tracking_code: order.tracking_code || order.carrier_order_code,
                })
              : await meLabel.cancelLabel({ orderId: id, order });
        }
        results.push({ order_id: id, ok: true, data });
      } catch (err) {
        results.push({ order_id: id, ok: false, error: err.message || String(err) });
      }
    }
    return { results };
  }

  throw new AppError(
    400,
    'VALIDATION_ERROR',
    'action inválida (status|tags_add|tags_remove|label_create|label_cancel)'
  );
}

module.exports = {
  createOrder,
  updateOrder,
  updateStatus,
  updateProduction,
  registerPayment,
  stats,
  listByUser,
  listOrders,
  facets,
  statusConfig,
  deleteOrder,
  bulkAction,
  validateAndNormalizeCheckout,
};
