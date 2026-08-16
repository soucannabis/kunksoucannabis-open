/**
 * Demo gravada exclusiva do login no Kunk.
 *
 * Garante o usuário Administrador admin@soucannabis.ong.br, preenche as
 * credenciais visualmente, entra no app e encerra após confirmar o login.
 *
 * Uso:
 *   npm run demo:login
 */
import {
  clickWithCursor,
  demoCommonEnv,
  demoKindOutDir,
  fmtSec,
  log,
  openDemoBrowser,
  pause,
  typeOverDuration,
} from './demo-lib.mjs';
import {
  kunkBaseUrl,
  waitUrl,
  waitVisible,
} from './demo-triagem-shared.mjs';

const ADMIN_EMAIL = 'admin@soucannabis.ong.br';
const ADMIN_PASSWORD = 'Admin@2026!';
const FINAL_HOLD_MS = 3_000;

async function ensureDemoAdmin() {
  const { ensureDemoAdminUser } = await import('../../kunk/e2e/helpers/db.js');
  log('setup', `garantindo Administrador ${ADMIN_EMAIL}…`);
  await ensureDemoAdminUser();
  log('setup', 'Administrador OK');
}

async function main() {
  const cfg = demoCommonEnv();
  const kunkUrl = kunkBaseUrl();
  const outDir = demoKindOutDir('login', cfg.outDir);

  log('start', '════════════ login Administrador ════════════');
  log('start', `kunk=${kunkUrl} | hold=${fmtSec(FINAL_HOLD_MS)} | outDir=${outDir}`);
  await ensureDemoAdmin();

  const { page, closeAndSave } = await openDemoBrowser({
    mobile: cfg.mobile,
    channel: cfg.channel,
    slowMo: cfg.slowMo,
    outDir,
    label: 'login',
  });

  try {
    await page.goto(`${kunkUrl}/login`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });

    const email = page.locator('#username');
    const password = page
      .locator('#password, input[name="password"], input[type="password"]')
      .first();
    const enter = page.getByRole('button', { name: /^Entrar$/i });

    await waitVisible(email, 20_000, 'campo de e-mail');
    await waitVisible(password, 20_000, 'campo de senha');
    await pause(page, 1_500, 'tela de login');

    await typeOverDuration(email, ADMIN_EMAIL, 2_200, 'E-mail');
    await typeOverDuration(password, ADMIN_PASSWORD, 1_500, 'Senha');
    await pause(page, 800, 'credenciais preenchidas');

    log('click', 'Entrar');
    await clickWithCursor(enter);
    log('click', '✓ Entrar');

    await waitUrl(page, /\/app\//, 45_000, 'login concluído');
    await waitVisible(
      page.getByText('Administrador Sou Cannabis', { exact: true }).first(),
      30_000,
      'usuário Administrador no app'
    );
    await pause(page, FINAL_HOLD_MS, 'login concluído');
  } finally {
    log('browser', 'fechando e salvando vídeo…');
    await closeAndSave();
  }
}

main().catch((err) => {
  console.error('\nFALHA:', err?.message || err);
  process.exit(1);
});
