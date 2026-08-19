#!/usr/bin/env node
/**
 * Cria link sandbox, abre checkout Pagar.me e tenta gerar boleto para disparar order.created.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

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
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {}
}

loadEnvFile(resolve(root, '.env.production.test'));

const API = process.env.E2E_API_URL.replace(/\/$/, '');
const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASS = process.env.E2E_ADMIN_PASSWORD;

async function api(path, { method = 'GET', body, cookie } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, json, cookie: setCookie?.split(';')[0] || cookie };
}

async function tryCheckout(page, paymentUrl) {
  console.log('Abrindo', paymentUrl);
  await page.goto(paymentUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  const title = await page.title();
  const bodyText = (await page.locator('body').innerText()).slice(0, 500);
  console.log('title:', title);
  console.log('body preview:', bodyText.replace(/\s+/g, ' ').slice(0, 200));

  if (/não encontramos|expirou|not found/i.test(bodyText)) {
    return { ok: false, reason: 'link_expired_or_missing' };
  }

  // Campos comuns checkout Pagar.me boleto
  const cpf = '52998224725';
  const email = 'teste-webhook@kunk.test';
  const name = 'Teste Webhook Kunk';

  const fillIfVisible = async (selectors, value) => {
    for (const sel of selectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
        await el.fill(value);
        return true;
      }
    }
    return false;
  };

  await fillIfVisible(['input[name="name"]', 'input[placeholder*="nome" i]', '#name'], name);
  await fillIfVisible(['input[name="email"]', 'input[type="email"]', '#email'], email);
  await fillIfVisible(['input[name="document"]', 'input[name="cpf"]', 'input[placeholder*="CPF" i]'], cpf);

  const clickFirst = async (patterns) => {
    for (const p of patterns) {
      const btn = page.getByRole('button', { name: p }).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        return true;
      }
      const link = page.getByRole('link', { name: p }).first();
      if (await link.isVisible({ timeout: 1000 }).catch(() => false)) {
        await link.click();
        return true;
      }
    }
    return false;
  };

  await clickFirst([/boleto/i, /continuar/i, /pagar/i, /gerar/i]);
  await page.waitForTimeout(3000);
  await clickFirst([/gerar boleto/i, /finalizar/i, /confirmar/i, /pagar/i]);

  await page.waitForTimeout(5000);
  const after = (await page.locator('body').innerText()).slice(0, 800);
  console.log('after checkout:', after.replace(/\s+/g, ' ').slice(0, 300));
  const boletoOk = /boleto|código de barras|vencimento|linha digitável/i.test(after);
  return { ok: boletoOk, reason: boletoOk ? 'boleto_generated' : 'checkout_incomplete', after: after.slice(0, 400) };
}

async function main() {
  console.log('=== Login ===');
  const login = await api('/auth/login', { method: 'POST', body: { email: EMAIL, password: PASS, app: 'admin' } });
  if (login.status !== 200) throw new Error('login failed: ' + JSON.stringify(login.json));
  const cookie = login.cookie;

  console.log('=== Criar link ===');
  const create = await api('/modules/pagarme/webhooks/test-payment', { method: 'POST', cookie });
  const tp = create.json?.data;
  if (!tp?.payment_url) throw new Error('create link failed: ' + JSON.stringify(create.json));
  console.log({ code: tp.code, url: tp.payment_url, is_sdx: /sdx/i.test(tp.payment_url) });

  console.log('=== Playwright checkout ===');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let checkout;
  try {
    checkout = await tryCheckout(page, tp.payment_url);
  } finally {
    await browser.close();
  }
  console.log('checkout result:', checkout);

  if (checkout.ok) {
    console.log('Aguardando 45s para entrega webhook Pagar.me...');
    await new Promise((r) => setTimeout(r, 45000));
  }

  console.log('=== Validar webhooks ===');
  const validate = await api('/modules/pagarme/webhooks/validate', { method: 'POST', cookie });
  const vd = validate.json?.data;
  console.log({
    ready: vd?.ready,
    reason: vd?.reason,
    webhook_receipt: vd?.webhook_receipt,
    details: vd?.details,
  });

  console.log('\n=== RESULTADO ===');
  console.log(
    JSON.stringify(
      {
        link_sandbox: /sdx/i.test(tp.payment_url),
        checkout: checkout,
        webhook_recebido: Boolean(vd?.webhook_receipt?.code),
        order_created_event: vd?.details?.order_created_event,
        validacao_ok: vd?.ready,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
