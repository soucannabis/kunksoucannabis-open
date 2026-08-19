#!/usr/bin/env node
/**
 * Validação read-only-ish do fluxo Pagar.me sandbox vs produção.
 * Não altera código do Kunk — usa API de produção (Railway) + probes Pagar.me.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnvFile(path) {
  try {
    const raw = readFileSync(path, 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i <= 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    /* optional */
  }
}

loadEnvFile(resolve(root, '.env.production.test'));

const API = (process.env.E2E_API_URL || 'https://kunk-api-production-19e6.up.railway.app/api/v1').replace(
  /\/$/,
  ''
);
const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASS = process.env.E2E_ADMIN_PASSWORD;

const PROD_PAGARME = 'https://api.pagar.me/core/v5';
const SDX_PAGARME = 'https://sdx-api.pagar.me/core/v5';

function section(title) {
  console.log('\n' + '='.repeat(72));
  console.log(title);
  console.log('='.repeat(72));
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) out[k] = obj?.[k] ?? null;
  return out;
}

async function api(path, { method = 'GET', body, cookie, headers = {} } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json, headers: res.headers };
}

function cookieFromSetCookie(setCookie) {
  if (!setCookie) return '';
  const parts = String(setCookie).split(';')[0];
  return parts;
}

async function pagarmeRequest(base, secretKey, path, { method = 'GET', body } = {}) {
  const url = `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  const auth = Buffer.from(`${secretKey}:`, 'utf8').toString('base64');
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 500) };
  }
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  section('Config');
  console.log({ API, EMAIL: EMAIL ? `${EMAIL.slice(0, 3)}***` : null });

  section('1. Login Admin');
  const login = await api('/auth/login', {
    method: 'POST',
    body: { email: EMAIL, password: PASS, app: 'admin' },
  });
  const cookie = cookieFromSetCookie(login.headers.get('set-cookie'));
  console.log('status:', login.status, 'success:', login.json?.data?.user?.email ?? login.json?.errors?.[0]?.code);
  if (!cookie) {
    console.error('Falha no login — abortando');
    process.exit(1);
  }

  section('2. Status Pagar.me (antes)');
  const statusBefore = await api('/modules/pagarme/status');
  const sb = statusBefore.json?.data || {};
  console.log(
    pick(sb, [
      'credentials_complete',
      'is_test_key',
      'api_base_url',
      'payment_links_api_base',
      'webhooks_validated',
    ])
  );
  console.log('webhook_urls:', sb.webhook_urls);

  section('3. Webhooks status (antes)');
  const whBefore = await api('/modules/pagarme/webhooks/status', { cookie });
  const wb = whBefore.json?.data || {};
  console.log(
    pick(wb, ['ready', 'reason', 'basic_auth_configured', 'basic_auth_user', 'validated_at'])
  );
  console.log('test_payment:', wb.test_payment);
  console.log('webhook_receipt:', wb.webhook_receipt);

  section('4. Criar link de pagamento de teste (sandbox se sk_test_)');
  const create = await api('/modules/pagarme/webhooks/test-payment', { method: 'POST', cookie });
  const tp = create.json?.data;
  console.log('HTTP', create.status);
  if (create.status !== 200) {
    console.log(JSON.stringify(create.json, null, 2));
    process.exit(1);
  }
  console.log(
    pick(tp, ['code', 'is_test_key', 'payment_url', 'checkout_id', 'method', 'expected_events', 'at'])
  );
  const isSdxUrl = /sdx\.pagar\.me/i.test(String(tp?.payment_url || ''));
  console.log('payment_url_is_sandbox (sdx):', isSdxUrl);

  section('5. Status após criar link');
  const statusAfter = await api('/modules/pagarme/status');
  const sa = statusAfter.json?.data || {};
  console.log(
    pick(sa, ['is_test_key', 'api_base_url', 'payment_links_api_base', 'webhooks_validated'])
  );

  section('6. Probe webhook Kunk (Basic Auth teste — simula Pagar.me)');
  const webhookUrl = sa.webhook_urls?.orders || sb.webhook_urls?.orders;
  const whUser = wb.basic_auth_user || 'teste';
  const whPass = 'teste';
  if (webhookUrl && tp?.code) {
    const basic = Buffer.from(`${whUser}:${whPass}`, 'utf8').toString('base64');
    const fakeEvent = {
      id: `evt_probe_${Date.now()}`,
      type: 'order.created',
      data: {
        id: tp.checkout_id || tp.order?.id,
        code: tp.code,
        status: 'pending',
      },
    };
    const probe = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${basic}`,
      },
      body: JSON.stringify(fakeEvent),
    });
    const probeText = await probe.text();
    console.log({ webhookUrl, probeStatus: probe.status, probeBody: probeText.slice(0, 200) });
  } else {
    console.log('Sem webhook URL ou code de teste — pulando probe');
  }

  section('7. Validar webhooks (persist — confere receipt real)');
  const validate = await api('/modules/pagarme/webhooks/validate', { method: 'POST', cookie });
  const vd = validate.json?.data || {};
  console.log('HTTP', validate.status);
  console.log(
    pick(vd, ['ready', 'reason', 'validated_at', 'module_enabled'])
  );
  console.log('webhook_receipt:', vd.webhook_receipt);
  console.log('details:', vd.details);
  console.log('probes:', vd.probes);

  section('8. Pagar.me API — comparar prod vs sdx (precisa secret no Admin)');
  const ext = await api('/admin/external-services/pagarme', { cookie });
  const creds = ext.json?.data?.credentials || [];
  const secretRow = creds.find((c) => c.field_key === 'secret_key');
  const apiBaseRow = creds.find((c) => c.field_key === 'api_base_url');
  const secretPreview = secretRow?.value_preview || secretRow?.masked_value || '';
  const isTestKey = /^sk_test/i.test(String(secretPreview));
  console.log({
    secret_has_value: secretRow?.has_value,
    secret_preview: secretPreview ? `${String(secretPreview).slice(0, 12)}…` : null,
    is_test_key_preview: isTestKey,
    configured_api_base: apiBaseRow?.value || apiBaseRow?.masked_value,
  });

  const secretFromEnv = process.env.PAGARME_SECRET_KEY?.trim();
  const secretKey = secretFromEnv || null;
  if (!secretKey) {
    console.log(
      'PAGARME_SECRET_KEY não disponível localmente — probes diretos Pagar.me omitidos.\n' +
        'Defina PAGARME_SECRET_KEY no ambiente para listar /hooks em prod vs sdx.'
    );
  } else {
    for (const [label, base] of [
      ['production (api.pagar.me)', PROD_PAGARME],
      ['sandbox (sdx-api.pagar.me)', SDX_PAGARME],
    ]) {
      console.log(`\n--- ${label} ---`);
      for (const path of ['/recipients?page=1&size=1', '/hooks?page=1&size=10']) {
        const r = await pagarmeRequest(base, secretKey, path);
        console.log(path, '→', r.status, r.ok ? 'OK' : r.data?.message || r.data?.errors?.[0]?.message || '');
      }
      if (tp?.checkout_id) {
        const pl = await pagarmeRequest(base, secretKey, `/paymentlinks/${tp.checkout_id}`);
        console.log(
          `/paymentlinks/${tp.checkout_id}`,
          '→',
          pl.status,
          pl.ok ? pick(pl.data, ['id', 'url', 'status', 'order_code']) : pl.data?.message
        );
      }
    }
  }

  section('9. Resumo');
  console.log({
    link_criado: Boolean(tp?.payment_url),
    ambiente_link: isSdxUrl ? 'sandbox (sdx)' : 'production/live',
    api_base_configurada: sa.api_base_url || sb.api_base_url,
    payment_links_api_base: sa.payment_links_api_base,
    mismatch_api_base_vs_link: !isSdxUrl && isTestKey,
    webhook_kunk_aceita_auth: validate.json?.data?.probes?.orders?.ok ?? null,
    webhook_real_pagarme: Boolean(
      validate.json?.data?.webhook_receipt?.type &&
        validate.json?.data?.webhook_receipt?.auth_ok !== false
    ),
    validacao_completa: Boolean(validate.json?.data?.ready),
    motivo: validate.json?.data?.reason,
  });

  console.log('\nPróximo passo manual: abrir payment_url no browser, gerar boleto, aguardar ~1min, POST validate novamente.');
  if (tp?.payment_url) console.log('URL:', tp.payment_url);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
