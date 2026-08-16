/**
 * Helpers compartilhados das demos de triagem → pedido / serviço.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import {
  env,
  fmtSec,
  fmtValue,
  log,
  pause,
  typeOverDuration,
} from './demo-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DEFAULT_KUNK_URL = 'http://localhost:4257';

export function clickRole(page, role, name, detail = '') {
  const label = detail || String(name);
  return (async () => {
    log('click', `${role}: ${label}`);
    await page.getByRole(role, { name }).click();
    log('click', `✓ ${role}: ${label}`);
  })();
}

export async function waitUrl(page, pattern, timeoutMs, label = '') {
  const where = label ? ` (${label})` : '';
  log(
    'wait-url',
    `até ${pattern}${where} | timeout=${fmtSec(timeoutMs)} | atual=${page.url()}`
  );
  await page.waitForURL(pattern, { timeout: timeoutMs });
  log('wait-url', `✓ ${page.url()}`);
}

export async function waitVisible(locator, timeoutMs, label) {
  log('wait-el', `visível: ${label} | timeout=${fmtSec(timeoutMs)}`);
  await locator.waitFor({ state: 'visible', timeout: timeoutMs });
  log('wait-el', `✓ ${label}`);
}

function parseEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const raw of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export function loadDatabaseUrl() {
  if (process.env.PG_URL) return process.env.PG_URL;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const fileEnv = parseEnvFile(
    path.resolve(__dirname, '../../../kunk-api/.env')
  );
  if (fileEnv.PG_URL) return fileEnv.PG_URL;
  if (fileEnv.DATABASE_URL) return fileEnv.DATABASE_URL;
  const host = process.env.PGHOST || fileEnv.PGHOST;
  const user = process.env.PGUSER || fileEnv.PGUSER;
  const password = process.env.PGPASSWORD ?? fileEnv.PGPASSWORD;
  const database = process.env.PGDATABASE || fileEnv.PGDATABASE;
  const port = process.env.PGPORT || fileEnv.PGPORT || '5432';
  if (host && user && database && password != null && password !== '') {
    return (
      `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(String(password))}` +
      `@${host}:${port}/${encodeURIComponent(database)}`
    );
  }
  return null;
}

function phoneDigitsForForm(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
  return d || '11999887766';
}

function mapAssociateRow(row) {
  return {
    email: String(row.email_account).trim(),
    name: String(row.associate_name || 'Associado').trim(),
    last_name: String(row.associate_last_name || '').trim() || 'Demo',
    phone: phoneDigitsForForm(row.mobile_number),
    user_code: row.user_code ? String(row.user_code) : null,
    status: row.status || null,
  };
}

export async function resolveDemoAssociate() {
  const preferredEmail = env('DEMO_ASSOCIATE_EMAIL', '');
  const connectionString = loadDatabaseUrl();
  if (!connectionString) {
    throw new Error(
      'Sem DATABASE_URL/PG* — defina DEMO_ASSOCIATE_EMAIL e um associado existente, ou configure o banco'
    );
  }
  const pool = new pg.Pool({ connectionString });
  try {
    if (preferredEmail) {
      log('setup', `buscando associado DEMO_ASSOCIATE_EMAIL=${preferredEmail}`);
      const { rows } = await pool.query(
        `SELECT email_account, associate_name, associate_last_name, mobile_number, user_code, status
         FROM users
         WHERE lower(email_account) = lower($1)
           AND (status IS NULL OR status <> 'patient')
         ORDER BY id DESC
         LIMIT 1`,
        [preferredEmail]
      );
      if (!rows[0]) throw new Error(`Associado não encontrado: ${preferredEmail}`);
      return mapAssociateRow(rows[0]);
    }
    log('setup', 'buscando Associado seed (@demo.kunk.local)…');
    const seed = await pool.query(
      `SELECT email_account, associate_name, associate_last_name, mobile_number, user_code, status
       FROM users
       WHERE status = 'Associado'
         AND email_account ILIKE '%@demo.kunk.local'
       ORDER BY email_account
       LIMIT 1`
    );
    if (seed.rows[0]) return mapAssociateRow(seed.rows[0]);
    const any = await pool.query(
      `SELECT email_account, associate_name, associate_last_name, mobile_number, user_code, status
       FROM users
       WHERE status = 'Associado'
         AND email_account IS NOT NULL
         AND email_account <> ''
       ORDER BY id
       LIMIT 1`
    );
    if (!any.rows[0]) {
      throw new Error(
        'Nenhum Associado no banco. Rode o seed ou defina DEMO_ASSOCIATE_EMAIL.'
      );
    }
    return mapAssociateRow(any.rows[0]);
  } finally {
    await pool.end();
  }
}

export async function ensureOperator() {
  try {
    const { ensureAcolhimentoUser } = await import('../../kunk/e2e/helpers/db.js');
    log('setup', 'garantindo usuário Acolhimento no banco…');
    await ensureAcolhimentoUser();
    log('setup', 'usuário Acolhimento OK');
  } catch (err) {
    log(
      'warn',
      `ensureAcolhimentoUser falhou (${err?.message || err}) — seguindo se o usuário já existir`
    );
  }
}

/**
 * Cria solicitação pública linkada ao associado (fica no topo da Espera).
 * @param {object} [opts]
 * @param {string} [opts.help_topic]
 * @param {string} [opts.message]
 * @param {string} [opts.name]
 * @param {string} [opts.last_name]
 * @param {string} [opts.phone]
 */
export async function seedLinkedReception(request, kunkUrl, associate, reason = 'demo', opts = {}) {
  const apiUrl = env('E2E_API_URL', `${kunkUrl}/api/v1`).replace(/\/$/, '');
  const phone =
    String(opts.phone || associate.phone || '')
      .replace(/\D/g, '') || '11999999999';
  const payload = {
    name: opts.name || associate.name,
    last_name: opts.last_name || associate.last_name,
    email: associate.email,
    phone,
    help_topic: opts.help_topic || 'Preciso de óleo / produto',
    message: opts.message || `Demo ${reason}: preciso de óleo.`,
  };
  log('setup', `POST /reception/public (${reason}) email=${associate.email}`);
  const res = await request.post(`${apiUrl}/reception/public`, {
    data: payload,
    failOnStatusCode: false,
  });
  const body = await res.json().catch(() => ({}));
  if (res.status() >= 400) {
    throw new Error(
      `Falha ao criar triagem HTTP ${res.status()}: ${body?.error || body?.message || JSON.stringify(body)}`
    );
  }
  log('setup', `triagem criada ✓ (associate_code=${body?.data?.associate_code || '—'})`);
  return body?.data || body;
}

export async function loginOperator(page, kunkUrl, email, password, options = {}) {
  const landingPattern = options.landingPattern || /\/(app|relatorio)\//;
  log('step', `login operador no Kunk (${email})`);
  log('goto', `${kunkUrl}/login`);
  await page.goto(`${kunkUrl}/login`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  log('goto', `✓ carregou ${page.url()}`);

  await waitVisible(page.locator('#username'), 20_000, '#username');
  await typeOverDuration(page.locator('#username'), email, 1800, 'E-mail (login)');

  const pass = page.locator('#password, input[name="password"], input[type="password"]').first();
  await typeOverDuration(pass, password, 1200, 'Senha (login)');
  await pause(page, 500, 'antes de Entrar');

  await clickRole(page, 'button', /^Entrar$/i, 'Entrar');
  await waitUrl(page, landingPattern, 45_000, 'app autenticado');
}

export async function openTriageEspera(page, kunkUrl) {
  const triageUrl = `${kunkUrl}/app/acolhimento/triagem`;
  log('goto', triageUrl);
  await page.goto(triageUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await waitUrl(page, /\/app\/acolhimento\/triagem/, 30_000, 'triagem');
  await waitVisible(page.locator('table tbody'), 30_000, 'fila de triagem');
  await pause(page, 1000, 'triagem carregada');

  // Status é um select (não mais abas). Garante filtro "Espera" quando existir.
  const statusSelect = page.getByLabel('Status');
  if (await statusSelect.count()) {
    const current = (await statusSelect.inputValue().catch(() => '')) || '';
    if (!/espera/i.test(current)) {
      log('click', 'filtro Status → Espera');
      await statusSelect.click();
      const option = page.getByRole('option', { name: /Espera/i }).first();
      if (await option.count()) {
        await option.click();
        await pause(page, 900, 'após filtrar Espera');
      } else {
        await page.keyboard.press('Escape').catch(() => null);
      }
    }
  }
}

export async function firstTriageRow(page, associateName = '') {
  const firstRow = page.locator('table tbody tr').first();
  await waitVisible(firstRow, 30_000, '1ª linha da fila');
  if (associateName) {
    await waitVisible(
      firstRow.getByText(new RegExp(associateName, 'i')).first(),
      20_000,
      `nome ${associateName} na 1ª linha`
    );
  }
  return firstRow;
}

/** Abre menu Pedido/Atendimento na 1ª linha e escolhe menuitem. */
export async function openActionFromFirstRow(page, menuitemName) {
  const firstRow = page.locator('table tbody tr').first();
  log('click', 'button: Ações de pedido e atendimento (1ª linha)');
  await firstRow.getByRole('button', { name: 'Ações de pedido e atendimento' }).click();
  await pause(page, 500, 'menu ações aberto');
  log('click', `menuitem: ${menuitemName}`);
  await page.getByRole('menuitem', { name: menuitemName }).click();
  log('click', `✓ menuitem ${menuitemName}`);
}

export function operatorCredentials() {
  return {
    email: env(
      'DEMO_OPERATOR_EMAIL',
      env('E2E_ACOL_EMAIL', 'acolhimento@kunk-api.test')
    ),
    password: env(
      'DEMO_OPERATOR_PASSWORD',
      env('E2E_ACOL_PASSWORD', 'TestAcol123!')
    ),
  };
}

export function kunkBaseUrl() {
  return env('DEMO_KUNK_URL', env('E2E_FRONT_URL', DEFAULT_KUNK_URL)).replace(
    /\/$/,
    ''
  );
}

export { log, pause, fmtSec, fmtValue, env, typeOverDuration };
