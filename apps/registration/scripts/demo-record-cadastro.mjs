/**
 * Demo gravada: funil de cadastramento (conta → dados → docs → termo → finalizar).
 *
 * Microsoft Edge (channel msedge) + perfil TEMPORÁRIO a cada run.
 *
 * Pré-requisitos (local):
 *   - API em :4250
 *   - apps/registration em :4255
 *   - apps/doc-sign em :4258 (assinatura do termo)
 *
 * Uso:
 *   cd apps/registration && npm run demo:cadastro
 *   cd apps/registration && npm run demo:cadastro:mobile
 *   cd apps/registration && npm run demo:cadastro:all
 *
 * Env úteis:
 *   DEMO_APP_URL       (default http://localhost:4255)
 *   DEMO_EMAIL         (default e-mail único demo-cadastro-…)
 *   DEMO_PASSWORD      (default senha123)
 *   DEMO_SLOW_MO       (default 350)
 *   DEMO_HOLD_MS       (pausa final — bem-vindo se --until-welcome, senão contato; default 15000)
 *   DEMO_CHANNEL       (default msedge)
 *   DEMO_CLEANUP=1     (apaga o associado criado via DB, se DATABASE_URL disponível)
 *   DEMO_STOP_AT=welcome | flag --until-welcome
 *                      para o vídeo na tela /bem-vindo (após criar a conta)
 *   --from-welcome-until-signature
 *                      faz login, parte de /bem-vindo e para no CTA Assinar termo
 *   --from-signature-until-contact
 *                      faz login, assina o termo e termina na página /contato
 *
 * No fim (funil completo): após cadastro concluído, clica em “Abrir uma solicitação de contato”,
 * aguarda /contato e mantém a tela por DEMO_HOLD_MS.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkWithCursor,
  clickWithCursor,
  demoCommonEnv,
  demoKindOutDir,
  env,
  fmtSec,
  fmtValue,
  log,
  moveDemoCursorTo,
  openDemoBrowser,
  pause,
  pulseDemoCursor,
  scrollDownABit,
  scrollPageToBottom,
  selectOptionWithCursor,
  typeInto,
  typeOverDuration,
  uniqueEmail,
} from './demo-lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_JPEG = join(__dirname, '..', 'demos', 'fixtures', 'doc.jpg');
const FIXTURE_CNH = join(__dirname, '..', 'demos', 'fixtures', 'cnh-aberta.jpg');
const FIXTURE_RECEITA = join(__dirname, '..', 'demos', 'fixtures', 'receita.jpg');

const VALID_CPF = '52998224725';

/** Cursor rápido entre campos do formulário (a digitação continua no ritmo normal). */
const FAST_CURSOR = { durationMs: 110, settleMs: 15, pulseMs: 60 };

const DEMO_PERSON = {
  associate_name: 'Ana',
  associate_last_name: 'Silva',
  associate_birth_date: '15/01/1990',
  gender: 'mulher-cis',
  associate_cpf: VALID_CPF,
  associate_rg: '1234567',
  associate_rg_issuer: 'SSP/SP',
  marital_status: 'Solteiro',
  mobile_number: '11999999999',
  street: 'Rua das Flores',
  street_number: '100',
  neighborhood: 'Centro',
  city: 'São Paulo',
  state: 'SP',
  cep: '01310100',
  reason_treatment_text: 'Dor crônica e acompanhamento terapêutico.',
  // Busca na UI pelo sintoma (label), não pelo código.
  ciap_codes: [
    { code: 'A01', symptom: 'Dor generalizada' },
    { code: 'A04', symptom: 'cansaço' },
    { code: 'P01', symptom: 'ansiedade' },
  ],
};

function labeledField(page, labelText) {
  return page
    .locator('label.form-label')
    .filter({
      has: page.locator('.form-label-title', {
        hasText: new RegExp(`^${labelText}$`),
      }),
    })
    .first();
}

async function clickRole(page, role, name, detail = '') {
  const label = detail || String(name);
  log('click', `${role}: ${label}`);
  await clickWithCursor(page.getByRole(role, { name }));
  log('click', `✓ ${role}: ${label}`);
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

async function fillLabeledInput(page, labelText, value, totalMs = 450) {
  const label = labeledField(page, labelText);
  const control = label.locator('xpath=following-sibling::*[1]');
  await typeInto(control, value, { totalMs, label: labelText, ...FAST_CURSOR });
}

/** type=date: digita DD/MM/AAAA (pt-BR) e garante value ISO yyyy-mm-dd. */
async function fillBirthDateBr(page, brDate, totalMs = 550) {
  const m = String(brDate).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) throw new Error(`Nascimento inválido (use DD/MM/AAAA): ${brDate}`);
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const digits = `${m[1]}${m[2]}${m[3]}`;
  const label = labeledField(page, 'Nascimento');
  const control = label.locator('xpath=following-sibling::*[1]');
  await control.waitFor({ state: 'visible', timeout: 30_000 });
  await control.scrollIntoViewIfNeeded().catch(() => null);
  log(
    'type',
    `Nascimento = ${fmtValue(brDate)} (digitos ${digits}, value=${iso}, ${fmtSec(totalMs)})`
  );
  await clickWithCursor(control, FAST_CURSOR);
  await control.fill('');
  const delay = Math.max(20, Math.floor(totalMs / digits.length));
  await control.pressSequentially(digits, { delay });
  const current = await control.inputValue();
  if (current !== iso) {
    log('type', `Nascimento ajuste fill → ${iso} (estava ${fmtValue(current)})`);
    await control.fill(iso);
  }
  log('type', 'Nascimento ✓ digitado');
}

async function selectLabeled(page, labelText, value) {
  const label = labeledField(page, labelText);
  const control = label.locator('xpath=following-sibling::*[1]');
  // GenderSelect / selects nativos: o following-sibling pode ser o <select>
  // ou (raro) um wrapper — preferir o select interno se existir.
  const select = (await control.evaluate((el) => el.tagName.toLowerCase())) === 'select'
    ? control
    : control.locator('select').first();
  await selectOptionWithCursor(select, value, {
    label: labelText,
    openHoldMs: 420,
    afterMs: 180,
    ...FAST_CURSOR,
  });
}

async function checkCiap(page, { code, symptom }) {
  const query = String(symptom || '').trim();
  if (!query) throw new Error(`CIAP ${code}: symptom de busca ausente`);
  log('ciap', `buscar sintoma ${fmtValue(query)} → marcar ${code}`);
  const addBtn = page.getByRole('button', { name: /Adicionar CIAP/i });
  if (await addBtn.count()) {
    log('click', 'button: Adicionar CIAP');
    await clickWithCursor(addBtn.first(), FAST_CURSOR);
    await pause(page, 220, 'após abrir seletor CIAP');
  }
  const search = page.locator('.kunk-ciap2-picker input.form-control').first();
  await search.waitFor({ state: 'visible', timeout: 15_000 });
  await typeOverDuration(
    search,
    query,
    Math.max(420, query.length * 45),
    'CIAP sintoma',
    FAST_CURSOR
  );
  await pause(page, 250, 'após busca por sintoma');

  const option = page
    .locator('label.kunk-ciap2-option')
    .filter({ hasText: new RegExp(`^${code}\\b`) })
    .first();
  const checkbox = option.locator('input[type="checkbox"]');
  await checkbox.scrollIntoViewIfNeeded();
  log('check', `CIAP ${code} (${query})`);
  await moveDemoCursorTo(option, {
    durationMs: FAST_CURSOR.durationMs,
    settleMs: FAST_CURSOR.settleMs,
  });
  await pulseDemoCursor(page, FAST_CURSOR.pulseMs);
  await checkbox.check({ force: true });
  log('check', `CIAP ${code} ✓`);
  await pause(page, 180, `após check CIAP ${code}`);
}

async function fillResponsibleFormDemo(page, data) {
  log('form', '── preenchimento dados do associado ──');
  log('click', 'radio: Para mim');
  await clickWithCursor(page.getByRole('radio', { name: /Para mim/i }), FAST_CURSOR);
  await pause(page, 250, 'após tipo Para mim');

  await fillLabeledInput(page, 'Nome', data.associate_name, 380);
  await fillLabeledInput(page, 'Sobrenome', data.associate_last_name, 420);
  await fillBirthDateBr(page, data.associate_birth_date, 520);
  await selectLabeled(page, 'Gênero', data.gender);
  await scrollDownABit(page, {
    ratio: 0.32,
    pauseMs: 320,
    label: 'após Gênero → próximos campos',
  });
  await fillLabeledInput(page, 'CPF', data.associate_cpf, 560);
  await fillLabeledInput(page, 'RG', data.associate_rg, 380);
  await fillLabeledInput(page, 'Órgão emissor', data.associate_rg_issuer, 420);
  await selectLabeled(page, 'Estado civil', data.marital_status);

  const phone = page
    .locator('.kunk-phone-input input[type="tel"], .react-tel-input input')
    .first();
  const digits = String(data.mobile_number).replace(/\D/g, '');
  log(
    'type',
    `Telefone = ${fmtValue(digits)} (${digits.length} dígitos, delay=28ms/char)`
  );
  await clickWithCursor(phone, FAST_CURSOR);
  await phone.fill('');
  await phone.pressSequentially(digits, { delay: 28 });
  log('type', 'Telefone ✓ digitado');
  await pause(page, 180, 'após telefone');

  await fillLabeledInput(page, 'Rua', data.street, 480);
  await fillLabeledInput(page, 'Número', data.street_number, 220);
  await fillLabeledInput(page, 'Bairro', data.neighborhood, 320);
  await fillLabeledInput(page, 'Cidade', data.city, 420);
  await selectLabeled(page, 'UF', data.state);
  await fillLabeledInput(page, 'CEP', data.cep, 420);

  const reason = page.locator('textarea').first();
  await typeInto(reason, data.reason_treatment_text, {
    totalMs: 900,
    label: 'Motivo do tratamento',
    ...FAST_CURSOR,
  });

  log(
    'form',
    `CIAP sintomas: ${(data.ciap_codes || [])
      .map((c) => `${fmtValue(c.symptom)}→${c.code}`)
      .join(', ')}`
  );
  for (const item of data.ciap_codes || []) {
    await checkCiap(page, item);
  }
  const closeBtn = page.getByRole('button', { name: /Fechar seletor/i });
  if (await closeBtn.count()) {
    log('click', 'button: Fechar seletor CIAP');
    await clickWithCursor(closeBtn, FAST_CURSOR);
  }
  await pause(page, 280, 'fim preenchimento formulário');
  log('form', '── formulário preenchido ──');
}

async function uploadDemoJpeg(page, inputId, filePath = FIXTURE_JPEG) {
  const input = page.locator(`#${inputId}`);
  log('wait-el', `input #${inputId} attached | timeout=${fmtSec(30_000)}`);
  await input.waitFor({ state: 'attached', timeout: 30_000 });
  if (!existsSync(filePath)) {
    throw new Error(`Fixture ausente: ${filePath}`);
  }
  log('upload', `#${inputId} ← ${filePath}`);
  await input.setInputFiles(filePath);
  log('upload', `#${inputId} ✓ arquivo enviado`);
  await pause(page, 700, `após upload ${inputId}`);
}

async function ensureDocSignTemplates(context, appUrl) {
  const apiUrl = env('E2E_API_URL', `${appUrl}/api/v1`).replace(/\/$/, '');
  log('templates', `garantir templates em ${apiUrl}`);
  const request = context.request;
  const login = await request.post(`${apiUrl}/auth/login`, {
    data: { email: 'admin@kunk-api.test', password: 'TestAdmin123!' },
    headers: { 'X-Kunk-App': 'admin' },
    failOnStatusCode: false,
  });
  if (login.status() !== 200) {
    log(
      'templates',
      `login admin falhou (HTTP ${login.status()}) — seguindo (templates podem já estar ok)`
    );
    return;
  }
  log('templates', 'login admin OK');
  const setCookie = login.headers()['set-cookie'];
  const cookie = Array.isArray(setCookie)
    ? setCookie.map((c) => String(c).split(';')[0]).join('; ')
    : String(setCookie || '').split(';')[0];

  for (const kind of ['self', 'with_patient']) {
    const tpl = await request.get(`${apiUrl}/doc-sign/templates/${kind}`, {
      headers: { Cookie: cookie },
      failOnStatusCode: false,
    });
    if (tpl.status() !== 200) {
      log('templates', `${kind} GET → HTTP ${tpl.status()} (ignorado)`);
      continue;
    }
    const body = await tpl.json().catch(() => ({}));
    if (body.data?.current_version_id) {
      log(
        'templates',
        `${kind} já publicado (version=${body.data.current_version_id})`
      );
      continue;
    }
    const res = await request.post(`${apiUrl}/doc-sign/templates/${kind}/publish`, {
      headers: { Cookie: cookie },
      data: { notes: 'demo auto-publish' },
      failOnStatusCode: false,
    });
    log('templates', `${kind} publish → HTTP ${res.status()}`);
  }
}

async function maybeCleanup(email) {
  if (env('DEMO_CLEANUP', '') !== '1') {
    log('cleanup', 'pulado (DEMO_CLEANUP≠1)');
    return;
  }
  try {
    const { deleteAssociateByEmail } = await import('../e2e/helpers/db.js');
    log('cleanup', `apagando associado ${email}`);
    await deleteAssociateByEmail(email);
    log('cleanup', `associado removido: ${email}`);
  } catch (err) {
    log('warn', `cleanup falhou: ${err?.message || err}`);
  }
}

/** Remove conta prévia do e-mail fixo para o signup da demo não falhar. */
async function ensureEmailAvailable(email) {
  try {
    const { deleteAssociateByEmail } = await import('../e2e/helpers/db.js');
    log('setup', `garantindo e-mail livre: ${email}`);
    const result = await deleteAssociateByEmail(email);
    log(
      'setup',
      `e-mail liberado (deletedUsers=${result?.deletedUsers ?? '?'})`
    );
  } catch (err) {
    log(
      'warn',
      `não foi possível limpar ${email}: ${err?.message || err} — seguindo`
    );
  }
}

async function main() {
  const cfg = demoCommonEnv();
  const format = cfg.mobile ? 'mobile' : 'desktop';
  const outDir = demoKindOutDir('cadastro', cfg.outDir);
  const stopAtWelcome =
    process.argv.includes('--until-welcome') ||
    env('DEMO_STOP_AT', '').toLowerCase() === 'welcome';
  const fromWelcomeUntilSignature = process.argv.includes(
    '--from-welcome-until-signature'
  );
  const fromSignatureUntilContact = process.argv.includes(
    '--from-signature-until-contact'
  );
  const email = env('DEMO_EMAIL', '') || uniqueEmail('demo-cadastro');
  const password = cfg.password;
  const person = DEMO_PERSON;
  const holdMs = stopAtWelcome || fromWelcomeUntilSignature
    ? Number(env('DEMO_HOLD_MS', '5000'))
    : cfg.holdMs;

  log('start', '══════════════════════════════════════');
  log(
    'start',
    `format=${format} | channel=${cfg.channel} | slowMo=${cfg.slowMo}ms | hold=${fmtSec(holdMs)}`
  );
  log('start', `app=${cfg.appUrl}`);
  log('start', `email=${email}`);
  log('start', `password=${fmtValue(password)}`);
  log(
    'start',
    `mode=${
      stopAtWelcome
        ? 'signup-until-welcome'
        : fromWelcomeUntilSignature
          ? 'welcome-until-signature'
          : fromSignatureUntilContact
            ? 'signature-until-contact'
          : 'full'
    }`
  );
  log('start', `outDir=${outDir}`);
  log('start', '══════════════════════════════════════');

  if (
    env('DEMO_EMAIL', '') &&
    !fromWelcomeUntilSignature &&
    !fromSignatureUntilContact
  ) {
    await ensureEmailAvailable(email);
  }
  if (fromSignatureUntilContact) {
    const { resetAssociateTermByEmail } = await import('../e2e/helpers/db.js');
    log('setup', `restaurando etapa de assinatura: ${email}`);
    const reset = await resetAssociateTermByEmail(email);
    log(
      'setup',
      `assinatura restaurada (contracts=${reset.deletedContracts}, files=${reset.deletedFiles})`
    );
  }

  const { context, page, closeAndSave } = await openDemoBrowser({
    mobile: cfg.mobile,
    channel: cfg.channel,
    slowMo: cfg.slowMo,
    outDir,
    label: 'cadastro',
  });

  try {
    if (!stopAtWelcome) {
      await ensureDocSignTemplates(context, cfg.appUrl);
    }

    if (fromSignatureUntilContact) {
      // Perfil limpo: autenticar a conta que o clipe anterior deixou na assinatura.
      log('step', 'login → assinatura do termo');
      log('goto', `${cfg.appUrl}/login`);
      await page.goto(`${cfg.appUrl}/login`, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });
      await waitVisible(
        page.getByRole('button', { name: /^Entrar$/i }),
        30_000,
        'button Entrar'
      );
      await typeOverDuration(page.locator('#login-email'), email, 1600, 'E-mail');
      await typeOverDuration(
        page.locator('#login-password'),
        password,
        900,
        'Senha'
      );
      await clickRole(page, 'button', /^Entrar$/i, 'Entrar');
      await waitUrl(page, /\/documentos/, 45_000, 'assinatura do termo');
      await waitVisible(
        page.getByRole('heading', { name: /Assinatura do termo/i }),
        30_000,
        'heading Assinatura do termo'
      );
      await waitVisible(
        page.getByRole('button', { name: /Assinar termo/i }),
        30_000,
        'button Assinar termo'
      );
      log('auth', 'login concluído — assinatura pronta');
      await pause(page, 1200, 'início do clipe na assinatura');
    } else if (fromWelcomeUntilSignature) {
      // Perfil do browser é limpo: autenticar a conta criada no clipe anterior.
      log('step', 'login → boas-vindas');
      log('goto', `${cfg.appUrl}/login`);
      await page.goto(`${cfg.appUrl}/login`, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });
      await waitVisible(
        page.getByRole('button', { name: /^Entrar$/i }),
        30_000,
        'button Entrar'
      );
      await typeOverDuration(
        page.locator('#login-email'),
        email,
        1600,
        'E-mail'
      );
      await typeOverDuration(
        page.locator('#login-password'),
        password,
        900,
        'Senha'
      );
      await clickRole(page, 'button', /^Entrar$/i, 'Entrar');
      await waitUrl(page, /\/bem-vindo/, 45_000, 'boas-vindas');
      await waitVisible(
        page.getByRole('link', { name: /Iniciar cadastro/i }),
        30_000,
        'link Iniciar cadastro'
      );
      log('auth', 'login concluído — bem-vindo');
      await pause(page, 1200, 'início do clipe na tela bem-vindo');
    } else {
      // —— 1. Criar conta ——
      log(
        'step',
        stopAtWelcome ? '1/1 criar conta → bem-vindo' : '1/5 criar conta'
      );
      log('goto', `${cfg.appUrl}/cadastro`);
      await page.goto(`${cfg.appUrl}/cadastro`, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });
      log('goto', `✓ carregou ${page.url()}`);
      await waitVisible(
        page.getByRole('heading', { name: /Cadastro de associado/i }),
        30_000,
        'heading Cadastro de associado'
      );
      await pause(page, 800, 'landing cadastro');

      if (cfg.mobile) {
        log('scroll', 'mobile: +25% viewport');
        await page.evaluate(() => {
          window.scrollBy({
            top: Math.round(window.innerHeight * 0.25),
            behavior: 'smooth',
          });
        });
        await pause(page, 700, 'após scroll mobile inicial');
      }

      const emailField = page.locator('input[type="email"]');
      const passFields = page.locator('input[type="password"]');
      log('auth', 'preenchendo credenciais da conta');
      await typeOverDuration(emailField, email, 2200, 'E-mail');
      await typeOverDuration(passFields.nth(0), password, 1200, 'Senha');
      await typeOverDuration(
        passFields.nth(1),
        password,
        1200,
        'Confirmar senha'
      );
      await pause(page, 500, 'antes de submeter cadastro');

      await clickRole(
        page,
        'button',
        /Se cadastrar como Associado/i,
        'Se cadastrar como Associado'
      );
      await waitUrl(page, /\/bem-vindo/, 45_000, 'conta criada');
      log('auth', 'conta criada — bem-vindo');
      await waitVisible(
        page.getByText(/bem-vindo|Bem-vindo|Iniciar cadastro/i).first(),
        20_000,
        'conteúdo bem-vindo'
      );

      if (stopAtWelcome) {
        log('finish', 'parado em /bem-vindo ✓');
        await pause(page, holdMs, 'hold final na tela bem-vindo');
        return;
      }

      await pause(page, 1500, 'tela bem-vindo');
    }

    if (!fromSignatureUntilContact) {
      // —— 2. Dados do associado ——
      log('step', '2/5 dados do associado');
      await clickRole(page, 'link', /Iniciar cadastro/i, 'Iniciar cadastro');
      await waitUrl(page, /\/cadastro-associado/, 30_000, 'formulário');
      await pause(page, 800, 'antes de preencher formulário');

      await fillResponsibleFormDemo(page, person);
      await scrollPageToBottom(page, {
        pauseMs: 1200,
        label: 'após formulário',
      });

      await clickRole(page, 'button', /Salvar e continuar/i, 'Salvar e continuar');
      await waitUrl(page, /\/documentos/, 45_000, 'documentos');
      log('docs', 'página de documentos');
      await pause(page, 1000, 'página documentos');

      // —— 3. Documentos (CNH) ——
      log('step', '3/5 documentos de identidade');
      await waitVisible(
        page.getByRole('heading', { name: /Documentos de identidade/i }),
        20_000,
        'heading Documentos de identidade'
      );
      log('docs', 'escolher CNH (aberta)');
      await clickRole(page, 'radio', /CNH \(aberta\)/i, 'CNH (aberta)');
      await pause(page, 600, 'após escolher CNH');
      await uploadDemoJpeg(page, 'responsible-front', FIXTURE_CNH);

      const sendDocs = page
        .locator('section.docs-subject')
        .filter({ hasText: 'Responsável' })
        .getByRole('button', { name: /^Enviar documentos$/i });
      log('click', 'button: Enviar documentos (Responsável)');
      await clickWithCursor(sendDocs);
      log('click', '✓ Enviar documentos');
      await waitVisible(
        page.getByRole('button', { name: /Avançar para assinatura/i }),
        30_000,
        'button Avançar para assinatura'
      );
      await pause(page, 800, 'antes de avançar assinatura');
      await clickRole(
        page,
        'button',
        /Avançar para assinatura/i,
        'Avançar para assinatura'
      );
      await waitVisible(
        page.getByRole('heading', { name: /Assinatura do termo/i }),
        30_000,
        'heading Assinatura do termo'
      );
      log('termo', 'CTA Assinar termo');
      await pause(page, 1200, 'tela CTA termo');

      if (fromWelcomeUntilSignature) {
        log('finish', 'parado antes do redirecionamento para o assinador ✓');
        await pause(page, holdMs, 'hold final no CTA Assinar termo');
        return;
      }
    }

    // —— 4. Assinar termo (doc-sign) ——
    log('step', '4/5 assinar termo');
    await waitVisible(
      page.getByRole('button', { name: /Assinar termo/i }),
      30_000,
      'button Assinar termo'
    );
    await clickRole(page, 'button', /Assinar termo/i, 'Assinar termo');
    await waitUrl(page, /\/assinar\//, 45_000, 'doc-sign');
    await waitVisible(
      page.locator('article.term-sheet'),
      45_000,
      'article.term-sheet'
    );
    log('termo', 'preview do termo visível');
    await pause(page, 1500, 'ler preview termo');
    await scrollPageToBottom(page, {
      pauseMs: 1500,
      label: 'preview termo',
    });

    log('termo', 'modo assinatura digitada');
    await clickRole(page, 'button', /^Digitar$/i, 'Digitar');
    await pause(page, 400, 'após modo Digitar');
    const fullName = `${person.associate_name} ${person.associate_last_name}`;
    await typeOverDuration(page.locator('#typed'), fullName, 1600, 'Assinatura (#typed)');
    log('check', 'consentimento de assinatura');
    await checkWithCursor(page.locator('.sign-consent input[type="checkbox"]'));
    log('check', 'consentimento ✓');
    await pause(page, 500, 'antes de Assinar e concluir');
    await clickRole(page, 'button', /Assinar e concluir/i, 'Assinar e concluir');
    await waitVisible(
      page.getByText(/Termo assinado com sucesso|já assinado/i),
      45_000,
      'confirmação termo assinado'
    );
    await waitUrl(page, /\/finalizar/, 45_000, 'finalizar');
    log('extras', 'tela finalizar');
    await pause(page, 1000, 'tela finalizar');

    // —— 5. Documentos extras + finalizar ——
    log('step', '5/5 anexos opcionais + finalizar');
    await clickRole(page, 'button', /^Anexar documentos$/i, 'Anexar documentos');
    await waitVisible(
      page.getByRole('heading', { name: /Receitas/i }),
      20_000,
      'heading Receitas'
    );
    await pause(page, 3000, 'painel Receitas aberto');
    await scrollDownABit(page, {
      ratio: 0.28,
      pauseMs: 700,
      label: 'painel Receitas → revelar upload',
    });

    await uploadDemoJpeg(page, 'extra-prescription', FIXTURE_RECEITA);
    // Evitar getByText("1 arquivo") — aparece no header da seção E em Receitas (strict mode).
    await waitVisible(
      page
        .locator('.docs-extra-kind')
        .filter({ has: page.locator('.docs-extra-kind-title', { hasText: /^Receitas$/i }) })
        .locator('.docs-subject-status.is-ok'),
      20_000,
      'Receitas status ok (enviado)'
    );
    await waitVisible(
      page.locator('.docs-preview-badge').filter({ hasText: /^Enviado$/ }).first(),
      10_000,
      'badge Enviado'
    );
    await pause(page, 500, 'após receita anexada');

    await scrollPageToBottom(page, {
      pauseMs: 1600,
      stepRatio: 0.28,
      stepDelayMs: 420,
      label: 'lento até Finalizar',
    });

    await clickRole(page, 'button', /Finalizar cadastro/i, 'Finalizar cadastro');
    await waitUrl(page, /\/cadastro-concluido/, 30_000, 'concluído');
    await waitVisible(
      page.getByText(/Cadastro concluído/i),
      20_000,
      'texto Cadastro concluído'
    );
    log('finish', 'cadastro concluído ✓');
    await pause(page, 1000, 'tela concluída antes do CTA');

    log('step', 'contato — abrir solicitação');
    await clickRole(
      page,
      'link',
      /Abrir uma solicitação de contato/i,
      'Abrir uma solicitação de contato'
    );
    await waitUrl(page, /\/contato/, 45_000, 'formulário de contato');
    await pause(page, 1200, 'página de contato aberta');
    await pause(page, holdMs, 'hold final no formulário de contato');
  } catch (err) {
    log('error', err?.message || String(err));
    if (err?.stack) console.error(err.stack);
    throw err;
  } finally {
    log('browser', 'fechando e salvando vídeo…');
    await closeAndSave();
    await maybeCleanup(email);
  }
}

main().catch((err) => {
  console.error('\nFALHA:', err?.message || err);
  process.exit(1);
});
