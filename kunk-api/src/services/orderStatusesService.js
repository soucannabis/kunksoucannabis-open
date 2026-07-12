'use strict';

const systemConfigService = require('./systemConfigService');

const ORDER_STATUS_AWAITING = 'Aguardando pagamento';
const ORDER_STATUS_PAID = 'Pagamento concluído';
const STORE_ORDER_STATUS_KEY = 'store.order_statuses';

const DEFAULT_STATUSES = [
  {
    id: 'awaiting_payment',
    value: ORDER_STATUS_AWAITING,
    label: ORDER_STATUS_AWAITING,
    order: 1,
    system: true,
    is_awaiting: true,
    color: '#c9a227',
  },
  {
    id: 'payment_done',
    value: ORDER_STATUS_PAID,
    label: ORDER_STATUS_PAID,
    order: 2,
    system: true,
    is_paid: true,
    color: '#2e7d32',
  },
];

function parseStatuses(raw) {
  if (raw == null || raw === '') return DEFAULT_STATUSES.map((s) => ({ ...s }));
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return DEFAULT_STATUSES.map((s) => ({ ...s }));
    }
  }
  if (!Array.isArray(parsed) || !parsed.length) {
    return DEFAULT_STATUSES.map((s) => ({ ...s }));
  }
  return parsed
    .filter((s) => s && s.value)
    .map((s, i) => ({
      id: s.id || `st_${i}`,
      value: String(s.value),
      label: String(s.label || s.value),
      order: Number(s.order) || i + 1,
      system: Boolean(s.system),
      is_awaiting: Boolean(s.is_awaiting),
      is_paid: Boolean(s.is_paid),
      color: s.color || '#5c6bc0',
    }))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

async function getOrderStatuses() {
  try {
    const resolved = await systemConfigService.resolveAll('store');
    return parseStatuses(resolved.values?.[STORE_ORDER_STATUS_KEY]);
  } catch {
    return DEFAULT_STATUSES.map((s) => ({ ...s }));
  }
}

function getAwaitingValue(statuses) {
  return (statuses || []).find((s) => s.is_awaiting)?.value || ORDER_STATUS_AWAITING;
}

function getPaidValue(statuses) {
  return (statuses || []).find((s) => s.is_paid)?.value || ORDER_STATUS_PAID;
}

function isAllowedStatus(status, statuses) {
  const v = String(status || '');
  return (statuses || []).some((s) => String(s.value) === v);
}

module.exports = {
  ORDER_STATUS_AWAITING,
  ORDER_STATUS_PAID,
  STORE_ORDER_STATUS_KEY,
  DEFAULT_STATUSES,
  getOrderStatuses,
  getAwaitingValue,
  getPaidValue,
  isAllowedStatus,
  parseStatuses,
};
