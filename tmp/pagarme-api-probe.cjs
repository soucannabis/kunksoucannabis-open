#!/usr/bin/env node
/** Probes diretos Pagar.me prod vs sdx usando credenciais do PG produção-teste. */
'use strict';

process.env.PGHOST = process.env.PGHOST || 'altaria.proxy.rlwy.net';
process.env.PGPORT = process.env.PGPORT || '26886';
process.env.PGDATABASE = process.env.PGDATABASE || 'railway';
process.env.PGUSER = process.env.PGUSER || 'postgres';
process.env.PGSSLMODE = process.env.PGSSLMODE || 'require';

const PROD = 'https://api.pagar.me/core/v5';
const SDX = 'https://sdx-api.pagar.me/core/v5';

async function pagarme(base, secret, path, method = 'GET') {
  const auth = Buffer.from(`${secret}:`, 'utf8').toString('base64');
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 300) };
  }
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  const kunkApi = require('../kunk-api/src/services/pagarme/client');
  const credentialsService = require('../kunk-api/src/services/credentialsService');
  const { query } = require('../kunk-api/src/db/pool');

  const creds = await credentialsService.resolveAll('pagarme');
  const secret = String(creds.secret_key || '').trim();
  const apiBase = String(creds.api_base_url || PROD).trim();
  const isTest = /^sk_test_/i.test(secret);

  console.log('=== Credenciais (PG produção-teste) ===');
  console.log({
    is_test_key: isTest,
    secret_prefix: secret.slice(0, 12) + '…',
    api_base_url: apiBase,
    payment_links_base: kunkApi.getPaymentLinksApiBase(secret, apiBase),
    webhook_user: creds.webhook_user,
  });

  const testPaymentRow = await query(
    `SELECT value FROM system_configs WHERE key = 'modules.pagarme.webhook_test_payment' LIMIT 1`
  );
  let testPayment = null;
  try {
    testPayment = JSON.parse(testPaymentRow.rows[0]?.value || 'null');
  } catch {
    testPayment = null;
  }
  const linkId = testPayment?.checkout_id;
  console.log('\n=== Link de teste atual ===');
  console.log({
    code: testPayment?.code,
    payment_url: testPayment?.payment_url,
    is_sdx_url: /sdx\.pagar\.me/i.test(String(testPayment?.payment_url || '')),
  });

  console.log('\n=== Comparativo API Pagar.me ===');
  for (const [label, base] of [
    ['PRODUCTION api.pagar.me', PROD],
    ['SANDBOX sdx-api.pagar.me', SDX],
    ['CONFIGURED api_base_url', apiBase],
  ]) {
    console.log(`\n--- ${label} (${base}) ---`);
    for (const path of ['/recipients?page=1&size=1', '/hooks?page=1&size=5']) {
      const r = await pagarme(base, secret, path);
      const hookCount = r.data?.data?.length ?? r.data?.length;
      console.log(`  ${path} → ${r.status}`, r.ok ? 'OK' : r.data?.message || r.data?.errors?.[0]?.message || '');
      if (path.includes('hooks') && r.ok) {
        const hooks = r.data?.data || r.data || [];
        const list = Array.isArray(hooks) ? hooks : [];
        console.log(
          `    hooks: ${list.length}`,
          list.slice(0, 3).map((h) => ({
            id: h.id,
            url: (h.url || '').slice(0, 60),
            status: h.status,
            last_attempt: h.last_attempt,
          }))
        );
      }
    }
    if (linkId) {
      const pl = await pagarme(base, secret, `/paymentlinks/${linkId}`);
      console.log(
        `  /paymentlinks/${linkId} → ${pl.status}`,
        pl.ok
          ? { id: pl.data?.id, url: pl.data?.url, status: pl.data?.status, order_code: pl.data?.order_code }
          : pl.data?.message || pl.data?.errors?.[0]?.message
      );
    }
  }

  console.log('\n=== Conclusão ===');
  const plProd = linkId ? await pagarme(PROD, secret, `/paymentlinks/${linkId}`) : null;
  const plSdx = linkId ? await pagarme(SDX, secret, `/paymentlinks/${linkId}`) : null;
  console.log({
    link_existe_em_sdx: plSdx?.ok === true,
    link_existe_em_prod: plProd?.ok === true,
    hooks_listaveis_em_sdx: (await pagarme(SDX, secret, '/hooks?page=1&size=1')).ok,
    hooks_listaveis_em_prod: (await pagarme(PROD, secret, '/hooks?page=1&size=1')).ok,
    api_base_mismatch: isTest && apiBase.includes('api.pagar.me') && !apiBase.includes('sdx'),
  });

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
