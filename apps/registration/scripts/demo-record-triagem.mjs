/**
 * Demo gravada: formulário público de triagem → login no Kunk → página de Triagem.
 *
 * Microsoft Edge (channel msedge) + perfil TEMPORÁRIO a cada run.
 *
 * Pré-requisitos (local):
 *   - API em :4250
 *   - apps/kunk em :4257
 *   - Microsoft Edge instalado
 *   - Associado existente no banco (seed demo ou DEMO_ASSOCIATE_EMAIL)
 *
 * Uso:
 *   cd apps/registration && npm run demo:triagem
 *   cd apps/registration && npm run demo:triagem:mobile
 *
 * Env úteis:
 *   DEMO_KUNK_URL           (default http://localhost:4257)
 *   DEMO_ASSOCIATE_EMAIL    (default: 1º Associado @demo.kunk.local no DB)
 *   DEMO_OPERATOR_EMAIL     (default acolhimento@kunk-api.test)
 *   DEMO_OPERATOR_PASSWORD  (default TestAcol123!)
 *   DEMO_SLOW_MO            (default 350)
 *   DEMO_HOLD_MS            (pausa final na triagem, default 15000)
 *   DEMO_CHANNEL            (default msedge)
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import {
  demoCommonEnv,
  demoKindOutDir,
  env,
  fmtSec,
  fmtValue,
  log,
  openDemoBrowser,
  pause,
  scrollDownABit,
  scrollPageToBottom,
  scrollPageToTop,
  typeOverDuration,
} from './demo-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_KUNK_URL = 'http://localhost:4257';

function clickRole(page, role, name, detail = '') {
  const label = detail || String(name);
  return (async () => {
    log('click', `${role}: ${label}`);
    await page.getByRole(role, { name }).click();
    log('click', `✓ ${role}: ${label}`);
  })();
}

async function waitUrl(page, pattern, timeoutMs, label = '') {
  const where = label ? ` (${label})` : '';
  log(
    'wait-url',
    `até ${pattern}${where} | timeout=${fmtSec(timeoutMs)} | atual=${page.url()}`
  );
  await page.waitForURL(pattern, { timeout: timeoutMs });
  log('wait-url', `✓ ${page.url()}`);
}

async function waitVisible(locator, timeoutMs, label) {
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

function loadDatabaseUrl() {
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
  // PhoneInput BR: prefer DDD+número local (11 dígitos) quando vier com 55
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

/** Busca um Associado já cadastrado para o form linkar automaticamente. */
async function resolveDemoAssociate() {
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
      if (!rows[0]) {
        throw new Error(`Associado não encontrado: ${preferredEmail}`);
      }
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

    log('setup', 'seed ausente — usando qualquer Associado…');
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

async function ensureOperator() {
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

async function fillTriageForm(page, data) {
  log('form', '── preenchimento formulário de triagem ──');
  log(
    'form',
    `associado linkado esperado: ${data.name} ${data.last_name} <${data.email}>`
  );

  await typeOverDuration(page.locator('#fila-name'), data.name, 900, 'Nome');
  await typeOverDuration(
    page.locator('#fila-last_name'),
    data.last_name,
    1000,
    'Sobrenome'
  );
  await typeOverDuration(page.locator('#fila-email'), data.email, 2200, 'E-mail');

  const phone = page.locator('#fila-phone, .fila-phone input[type="tel"]').first();
  const digits = String(data.phone).replace(/\D/g, '');
  log(
    'type',
    `Telefone = ${fmtValue(digits)} (${digits.length} dígitos, delay=60ms/char)`
  );
  await phone.click();
  await phone.fill('');
  await phone.pressSequentially(digits, { delay: 60 });
  log('type', 'Telefone ✓ digitado');
  await pause(page, 400, 'após telefone');

  await scrollDownABit(page, {
    ratio: 0.28,
    pauseMs: 600,
    label: 'após telefone → motivo/mensagem',
  });

  const helpTopic = page.locator('#fila-help_topic');
  if (await helpTopic.count()) {
    const topic = data.help_topic || 'Preciso de óleo / produto';
    log('select', `Como podemos ajudar? = ${fmtValue(topic)}`);
    await helpTopic.selectOption({ label: topic }).catch(async () => {
      const options = helpTopic.locator('option');
      const optionCount = await options.count();
      let picked = '';
      for (let i = 0; i < optionCount; i += 1) {
        const value = await options.nth(i).getAttribute('value');
        if (value) {
          picked = value;
          break;
        }
      }
      if (!picked) throw new Error('select help_topic sem opções');
      log('select', `fallback help_topic = ${fmtValue(picked)}`);
      await helpTopic.selectOption(picked);
    });
    log('select', 'Como podemos ajudar? ✓');
    await pause(page, 400, 'após help_topic');
  }

  const message = page.locator('#fila-message');
  if (await message.count()) {
    const text =
      data.message ||
      'Olá! Sou associada e preciso de óleo. Gostaria de saber disponibilidade e como solicitar.';
    await typeOverDuration(
      message,
      text,
      Math.max(1600, text.length * 45),
      'Mensagem'
    );
  }

  await pause(page, 600, 'fim preenchimento triagem');
  log('form', '── formulário triagem preenchido ──');
}

async function loginOperator(page, kunkUrl, email, password) {
  log('step', '2/3 login operador no Kunk');
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
  await waitUrl(page, /\/app\//, 45_000, 'app autenticado');
}

async function openTriagePage(page, kunkUrl, contact) {
  log('step', '3/3 página de Triagem');
  const triageUrl = `${kunkUrl}/app/acolhimento/triagem`;
  if (!/\/app\/acolhimento\/triagem/.test(page.url())) {
    log('goto', triageUrl);
    await page.goto(triageUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
  }
  await waitUrl(page, /\/app\/acolhimento\/triagem/, 30_000, 'triagem');
  await waitVisible(page.getByRole('tab').first(), 30_000, 'abas de status');
  await pause(page, 1200, 'triagem carregada');

  const esperaTab = page.getByRole('tab', { name: /Espera/i });
  if (await esperaTab.count()) {
    log('click', 'tab: Espera');
    await esperaTab.first().click();
    await pause(page, 900, 'após aba Espera');
  }

  const firstRow = page.locator('table tbody tr').first();
  await waitVisible(firstRow, 30_000, '1ª linha da fila');
  await waitVisible(
    firstRow.getByText(new RegExp(contact.name, 'i')).first(),
    20_000,
    `nome ${contact.name} na 1ª linha`
  );
  log('finish', 'triagem aberta com solicitação no topo ✓');
}

async function main() {
  const cfg = demoCommonEnv();
  const format = cfg.mobile ? 'mobile' : 'desktop';
  const outDir = demoKindOutDir('triagem', cfg.outDir);
  const kunkUrl = env('DEMO_KUNK_URL', env('E2E_FRONT_URL', DEFAULT_KUNK_URL)).replace(
    /\/$/,
    ''
  );
  const operatorEmail = env(
    'DEMO_OPERATOR_EMAIL',
    env('E2E_ACOL_EMAIL', 'acolhimento@kunk-api.test')
  );
  const operatorPassword = env(
    'DEMO_OPERATOR_PASSWORD',
    env('E2E_ACOL_PASSWORD', 'TestAcol123!')
  );

  log('start', '══════════════════════════════════════');
  log(
    'start',
    `format=${format} | channel=${cfg.channel} | slowMo=${cfg.slowMo}ms | hold=${fmtSec(cfg.holdMs)}`
  );
  log('start', `kunk=${kunkUrl}`);
  log('start', `operador=${operatorEmail}`);
  log('start', `outDir=${outDir}`);
  log('start', '══════════════════════════════════════');

  await ensureOperator();
  const associate = await resolveDemoAssociate();
  const contact = {
    ...associate,
    help_topic: 'Preciso de óleo / produto',
    message:
      'Olá! Sou associada e preciso de óleo. Gostaria de saber disponibilidade e como solicitar.',
  };
  log(
    'setup',
    `associado=${contact.name} ${contact.last_name} <${contact.email}> tel=${contact.phone}`
  );

  const { page, closeAndSave } = await openDemoBrowser({
    mobile: cfg.mobile,
    channel: cfg.channel,
    slowMo: cfg.slowMo,
    outDir,
    label: 'triagem',
  });

  try {
    // —— 1. Formulário público ——
    log('step', '1/3 formulário público /contato');
    log('goto', `${kunkUrl}/contato`);
    await page.goto(`${kunkUrl}/contato`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    log('goto', `✓ carregou ${page.url()}`);

    await waitVisible(
      page.getByRole('heading', { name: /Fila de acolhimento/i }),
      30_000,
      'heading Fila de acolhimento'
    );
    await waitVisible(
      page.getByRole('button', { name: /Entrar na fila/i }),
      20_000,
      'button Entrar na fila'
    );
    await pause(page, 1000, 'landing contato');

    await fillTriageForm(page, contact);
    await scrollPageToBottom(page, {
      pauseMs: 1000,
      label: 'antes de Entrar na fila',
    });

    await clickRole(page, 'button', /Entrar na fila/i, 'Entrar na fila');
    await waitVisible(
      page.getByRole('heading', { name: /Você entrou na fila/i }),
      30_000,
      'sucesso Você entrou na fila'
    );
    await waitVisible(
      page.getByText(/equipe de acolhimento entrará em contato/i),
      15_000,
      'texto equipe de acolhimento'
    );
    log('form', 'solicitação enviada ✓');
    await pause(page, 2500, 'tela sucesso contato');

    // —— 2. Login operador ——
    await loginOperator(page, kunkUrl, operatorEmail, operatorPassword);
    await pause(page, 1000, 'após login');

    // —— 3. Triagem (sem filtro) ——
    await openTriagePage(page, kunkUrl, contact);
    await scrollPageToBottom(page, {
      pauseMs: 1000,
      stepRatio: 0.35,
      stepDelayMs: 320,
      label: 'triagem até o fim',
    });
    await scrollPageToTop(page, {
      pauseMs: 1000,
      stepRatio: 0.35,
      stepDelayMs: 320,
      label: 'triagem de volta ao topo',
    });
    await pause(page, 10_000, 'hold final 10s');
    log('finish', 'demo triagem finalizada ✓');
  } catch (err) {
    log('error', err?.message || String(err));
    if (err?.stack) console.error(err.stack);
    throw err;
  } finally {
    log('browser', 'fechando e salvando vídeo…');
    await closeAndSave();
  }
}

main().catch((err) => {
  console.error('\nFALHA:', err?.message || err);
  process.exit(1);
});
