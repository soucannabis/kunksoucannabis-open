'use strict';

const { DELIVERY_TIMEOUT_MS } = require('./catalog');
const { buildHeaders } = require('./sign');

async function postJson(url, body, headers, timeoutMs = DELIVERY_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });
    const text = await res.text().catch(() => '');
    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      body: text.slice(0, 1000),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function dispatchDelivery(delivery, { url, secret }) {
  const body = JSON.stringify(delivery.payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const headers = buildHeaders({
    eventId: delivery.event_id || delivery.payload?.id,
    deliveryId: delivery.id,
    table: delivery.table_name,
    action: delivery.action,
    secret,
    body,
    timestamp,
  });
  try {
    const result = await postJson(url, body, headers);
    return result;
  } catch (err) {
    const aborted = err?.name === 'AbortError';
    return {
      ok: false,
      status: null,
      body: '',
      error: aborted ? 'timeout' : err.message || String(err),
    };
  }
}

module.exports = { postJson, dispatchDelivery };
