#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnvFile(path) {
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
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

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(opts.cookie ? { Cookie: opts.cookie } : {}) },
    body: opts.body != null ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, json, cookie: res.headers.get('set-cookie')?.split(';')[0] || opts.cookie };
}

async function checkout(page, url) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(5000);

  // Espera sair do "Carregando ambiente"
  await page.waitForFunction(
    () => !document.body.innerText.includes('Carregando ambiente'),
    { timeout: 60000 }
  ).catch(() => {});

  const text0 = await page.locator('body').innerText();
  if (/não encontramos|expirou/i.test(text0)) return { ok: false, reason: 'expired', text: text0.slice(0, 200) };

  // Email
  const email = page.locator('input[type="email"], input[name*="email" i]').first();
  await email.waitFor({ state: 'visible', timeout: 30000 });
  await email.fill('webhook-test@kunk.local');

  const visibleInputs = page.locator('input:visible:not([type="hidden"])');
  await visibleInputs.nth(1).fill('Teste Webhook Kunk');
  // nth(2) pode ser documento se CPF já selecionado
  const docIdx = 2;
  if (!(await visibleInputs.nth(docIdx).inputValue()).replace(/\D/g, '')) {
    await visibleInputs.nth(docIdx).fill('52998224725');
  }
  // celular — último input visível antes do botão
  const n = await visibleInputs.count();
  await visibleInputs.nth(n - 1).fill('11999998888');

  // Tipo documento — select nativo
  const nativeSelect = page.locator('select').first();
  if (await nativeSelect.count()) {
    await nativeSelect.selectOption({ value: 'cpf' }).catch(() => nativeSelect.selectOption({ label: 'CPF' }));
  }

  // Número documento
  const docNum = page.locator('input[name*="document" i], input[placeholder*="documento" i], input[inputmode="numeric"]').last();
  if (await docNum.isVisible().catch(() => false)) {
    await docNum.fill('52998224725');
  } else {
    const inputs = page.locator('input:not([type="email"]):not([type="hidden"])');
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const inp = inputs.nth(i);
      const ph = (await inp.getAttribute('placeholder')) || '';
      const nm = (await inp.getAttribute('name')) || '';
      if (/document|cpf|número/i.test(ph + nm)) {
        await inp.fill('52998224725');
        break;
      }
    }
  }

  await page.screenshot({ path: resolve(root, 'tmp/pagarme-checkout-before.png'), fullPage: true });

  // Botão final
  const submit = page.getByRole('button', { name: /continuar|gerar|finalizar|pagar|confirmar/i }).last();
  await submit.waitFor({ state: 'visible', timeout: 15000 });
  await submit.click();
  await page.waitForTimeout(5000);

  // Segunda etapa — gerar boleto
  const submit2 = page.getByRole('button', { name: /gerar boleto|finalizar|confirmar|pagar/i }).first();
  if (await submit2.isVisible({ timeout: 8000 }).catch(() => false)) {
    await submit2.click();
    await page.waitForTimeout(8000);
  }
  await page.screenshot({ path: resolve(root, 'tmp/pagarme-checkout-after.png'), fullPage: true });

  const text1 = await page.locator('body').innerText();
  const ok = /linha digitável|código de barras|copiar código|vencimento|boleto gerado|aguardando pagamento/i.test(text1);
  return { ok, reason: ok ? 'boleto_confirmed' : 'form_submitted_unknown', text: text1.slice(0, 600) };
}

async function main() {
  const login = await api('/auth/login', {
    method: 'POST',
    body: { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD, app: 'admin' },
  });
  const cookie = login.cookie;
  const create = await api('/modules/pagarme/webhooks/test-payment', { method: 'POST', cookie });
  const tp = create.json?.data;
  console.log('link:', tp?.payment_url, 'code:', tp?.code);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let result;
  try {
    result = await checkout(page, tp.payment_url);
  } finally {
    await browser.close();
  }
  console.log('checkout:', result);

  for (const wait of [30, 30, 30]) {
    console.log(`aguardando ${wait}s...`);
    await new Promise((r) => setTimeout(r, wait * 1000));
    const v = await api('/modules/pagarme/webhooks/validate', { method: 'POST', cookie });
    const d = v.json?.data;
    console.log({ ready: d?.ready, receipt: d?.webhook_receipt, reason: d?.reason?.slice(0, 120) });
    if (d?.webhook_receipt?.code) break;
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
