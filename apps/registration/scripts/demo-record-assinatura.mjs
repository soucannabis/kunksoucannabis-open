/**
 * Demo gravada: Assinatura de Termos (apps/doc-sign em :4258).
 *
 * Fluxo:
 * 1. Login Administrador
 * 2. Menu Modelos → espera 5s
 * 3. Editar o primeiro modelo
 * 4. Scroll lento até o fim
 * 5. Publicar
 * 6. Menu Termos
 * 7. Ícone de olho do primeiro termo (sem busca/filtro)
 * 8. Baixar termo → PDF (scroll até o fim) → fecha
 * 9. Histórico completo → scroll fim → topo → hold 15s
 *
 * Uso:
 *   npm run demo:assinatura
 */
import {
  clickWithCursor,
  demoCommonEnv,
  demoKindOutDir,
  env,
  fmtSec,
  log,
  openDemoBrowser,
  pause,
  typeOverDuration,
} from './demo-lib.mjs';
import { waitUrl, waitVisible } from './demo-triagem-shared.mjs';

const DEFAULT_DOC_SIGN_URL = 'http://localhost:4258';
const ADMIN_EMAIL = env('DEMO_ADMIN_EMAIL', 'admin@soucannabis.ong.br');
const ADMIN_PASSWORD = env('DEMO_ADMIN_PASSWORD', 'Admin@2026!');
const MODELOS_HOLD_MS = 5_000;
const AFTER_LOGIN_HOLD_MS = 5_000;
const SCROLL_SPEED_PX_PER_SEC = 280;
const SCROLL_MIN_MS = 1_200;
const SCROLL_MAX_MS = 6_000;

function docSignUrl() {
  return env('DEMO_DOC_SIGN_URL', env('E2E_FRONT_URL', DEFAULT_DOC_SIGN_URL)).replace(
    /\/$/,
    ''
  );
}

async function click(page, locator, label) {
  log('click', label);
  await clickWithCursor(locator);
  log('click', `✓ ${label}`);
}

async function ensureDemoAdmin() {
  const { ensureDemoAdminUser } = await import('../../kunk/e2e/helpers/db.js');
  log('setup', `garantindo Administrador ${ADMIN_EMAIL}…`);
  await ensureDemoAdminUser();
  log('setup', 'Administrador OK');
}

async function loginDocSign(page, baseUrl) {
  log('goto', `${baseUrl}/login`);
  await page.goto(`${baseUrl}/login`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  const email = page.locator('#email');
  const password = page.locator('#password');
  const enter = page.locator('.auth-login-submit');
  await waitVisible(email, 20_000, 'campo de e-mail');
  await waitVisible(password, 20_000, 'campo de senha');
  await pause(page, 1_200, 'tela de login');
  await typeOverDuration(email, ADMIN_EMAIL, 2_200, 'E-mail');
  await typeOverDuration(password, ADMIN_PASSWORD, 1_500, 'Senha');
  await pause(page, 600, 'credenciais preenchidas');
  await click(page, enter, 'Entrar');

  await page.waitForFunction(
    () =>
      /\/termos/.test(location.pathname) ||
      Boolean(document.querySelector('.auth-login-alert')) ||
      Boolean(document.getElementById('assoc-incomplete-title')),
    null,
    { timeout: 45_000 }
  );

  const assocTitle = page.locator('#assoc-incomplete-title');
  if (await assocTitle.isVisible().catch(() => false)) {
    const missing = await page.locator('.modal-panel li').allTextContents();
    throw new Error(
      `Dados da associação incompletos no Admin: ${missing.join(', ') || '(lista vazia)'}`
    );
  }
  const loginAlert = page.locator('.auth-login-alert');
  if (await loginAlert.isVisible().catch(() => false)) {
    throw new Error(`Login recusado: ${(await loginAlert.innerText()).trim()}`);
  }

  await waitUrl(page, /\/termos/, 20_000, 'Termos após login');
  await waitVisible(page.getByRole('heading', { name: 'Termos' }), 20_000, 'página Termos');
}

async function scrollableMax(page) {
  return page.evaluate(() => {
    const doc = document.scrollingElement || document.documentElement;
    const inner = [...document.querySelectorAll('main, .shell, .app')]
      .filter((el) => {
        if (el.scrollHeight - el.clientHeight <= 8) return false;
        const style = getComputedStyle(el);
        return /(auto|scroll)/.test(style.overflowY) && el.getClientRects().length > 0;
      })
      .sort(
        (a, b) =>
          b.scrollHeight - b.clientHeight - (a.scrollHeight - a.clientHeight)
      )[0];
    const scroller = doc.scrollHeight - doc.clientHeight > 8 ? doc : inner || doc;
    return Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  });
}

async function scrollWindowFor(page, totalMs, direction, label) {
  const duration = Math.max(500, Number(totalMs) || 0);
  log('scroll', `${direction === 'down' ? '↓' : '↑'} ${label} em ${fmtSec(duration)}`);
  const moved = await page.evaluate(
    async ({ ms, dir }) => {
      const doc = document.scrollingElement || document.documentElement;
      const inner = [...document.querySelectorAll('main, .shell, .app')]
        .filter((el) => {
          if (el.scrollHeight - el.clientHeight <= 8) return false;
          const style = getComputedStyle(el);
          return /(auto|scroll)/.test(style.overflowY) && el.getClientRects().length > 0;
        })
        .sort(
          (a, b) =>
            b.scrollHeight - b.clientHeight - (a.scrollHeight - a.clientHeight)
        )[0];
      const scroller = doc.scrollHeight - doc.clientHeight > 8 ? doc : inner || doc;
      const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      const from = dir === 'down' ? 0 : max;
      const to = dir === 'down' ? max : 0;
      scroller.scrollTo({ top: from, behavior: 'instant' });
      await new Promise((resolve) => {
        const begun = performance.now();
        const step = () => {
          const progress = Math.min(1, (performance.now() - begun) / ms);
          scroller.scrollTo({
            top: from + (to - from) * progress,
            behavior: 'instant',
          });
          if (progress >= 1) {
            resolve();
            return;
          }
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      return { max, final: Math.round(scroller.scrollTop) };
    },
    { ms: duration, dir: direction }
  );
  log(
    'scroll',
    `✓ ${label} | max=${moved.max}px | y=${moved.final}px em ${fmtSec(duration)}`
  );
  if (moved.max <= 8) log('warn', `${label} não tem área rolável`);
}

function travelMsFor(maxPx) {
  return Math.min(
    SCROLL_MAX_MS,
    Math.max(SCROLL_MIN_MS, Math.round((maxPx / SCROLL_SPEED_PX_PER_SEC) * 1000))
  );
}

async function scrollToEnd(page, label) {
  const max = await scrollableMax(page);
  if (max <= 24) {
    log('scroll', `${label} | quase sem rolagem (${max}px)`);
    await pause(page, 2_000, `${label} sem scroll`);
    return;
  }
  await scrollWindowFor(page, travelMsFor(max), 'down', `${label} topo ao fim`);
}

async function scrollRoundTrip(page, label) {
  const max = await scrollableMax(page);
  if (max <= 24) {
    log('scroll', `${label} | quase sem rolagem (${max}px)`);
    await pause(page, 2_000, `${label} sem scroll`);
    return;
  }
  const ms = travelMsFor(max);
  await scrollWindowFor(page, ms, 'down', `${label} topo ao fim`);
  await pause(page, 800, `${label} no fim`);
  await scrollWindowFor(page, ms, 'up', `${label} fim ao topo`);
}

async function viewPdfAndClose(page, termUrl) {
  const steps = 8;
  const stepMs = 1_400;
  await pause(page, 1_000, 'PDF carregando');
  const vx = Math.round(page.viewportSize()?.width / 2 || 640);
  const vy = Math.round(page.viewportSize()?.height / 2 || 400);
  await page.mouse.click(vx, vy);
  await pause(page, 400, 'foco no PDF');
  log('scroll', `PDF — ${steps} passos até o fim`);
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press('PageDown');
    await pause(page, stepMs, `PDF passo ${i + 1}/${steps}`);
  }
  await pause(page, 2_400, 'fim do PDF');
  log('nav', 'fechando PDF e voltando ao termo');
  await page.goto(termUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForLoadState('networkidle').catch(() => null);
  await waitVisible(page.getByRole('button', { name: /Baixar termo/i }), 20_000, 'termo após PDF');
  await waitVisible(
    page.locator('a').filter({ hasText: 'Histórico completo' }),
    20_000,
    'Histórico completo após PDF'
  );
}

async function downloadTermPdf(page) {
  const termUrl = page.url();
  const downloadBtn = page.getByRole('button', { name: /Baixar termo/i });
  await waitVisible(downloadBtn, 15_000, 'Baixar termo');

  const popupPromise = page.waitForEvent('popup', { timeout: 8_000 }).catch(() => null);
  await click(page, downloadBtn, 'Baixar termo');
  const popup = await popupPromise;

  if (popup) {
    await popup.waitForLoadState('domcontentloaded').catch(() => null);
    const pdfUrl = popup.url();
    log('pdf', `popup=${pdfUrl || '(vazio)'}`);
    await popup.close().catch(() => null);
    if (pdfUrl && pdfUrl !== 'about:blank') {
      await page.goto(pdfUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await viewPdfAndClose(page, termUrl);
      return;
    }
  }

  if (!/\/termos\//.test(page.url())) {
    await viewPdfAndClose(page, termUrl);
    return;
  }

  const toast = page.getByText(/PDF do termo ainda não disponível/i);
  if (await toast.isVisible().catch(() => false)) {
    log('warn', 'PDF do termo indisponível — seguindo sem visualizar');
    await pause(page, 2_000, 'toast PDF indisponível');
    return;
  }
  log('warn', 'popup do PDF não apareceu — seguindo');
}

async function main() {
  const cfg = demoCommonEnv();
  const baseUrl = docSignUrl();
  const outDir = demoKindOutDir('assinatura', cfg.outDir);
  const holdMs = Number(process.env.DEMO_HOLD_MS || cfg.holdMs || 15_000);

  log('start', '════════════ assinatura de termos ════════════');
  log('start', `doc-sign=${baseUrl} | hold=${fmtSec(holdMs)} | outDir=${outDir}`);
  await ensureDemoAdmin();

  const { page, closeAndSave } = await openDemoBrowser({
    mobile: cfg.mobile,
    channel: cfg.channel,
    slowMo: cfg.slowMo,
    outDir,
    label: 'assinatura',
  });

  try {
    await loginDocSign(page, baseUrl);
    await pause(page, AFTER_LOGIN_HOLD_MS, 'após login, antes de Modelos');

    const modelos = page.getByRole('link', { name: /^Modelos$/i });
    await waitVisible(modelos, 15_000, 'menu Modelos');
    await click(page, modelos, 'Modelos');
    await waitUrl(page, /\/modelos\/?$/, 20_000, 'lista de modelos');
    await waitVisible(
      page.getByRole('heading', { name: /Modelos de termo/i }),
      20_000,
      'título Modelos'
    );
    await pause(page, MODELOS_HOLD_MS, 'mostrar modelos');

    const editFirst = page.getByRole('link', { name: /^Editar$/i }).first();
    await waitVisible(editFirst, 15_000, 'Editar (primeiro modelo)');
    await click(page, editFirst, 'Editar primeiro modelo');
    await waitUrl(page, /\/modelos\/[^/]+/, 20_000, 'editor do modelo');
    await waitVisible(
      page.getByRole('heading', { name: /Editar modelo/i }),
      20_000,
      'Editar modelo'
    );
    await pause(page, 800, 'editor aberto');

    await scrollToEnd(page, 'editor do modelo');
    await pause(page, 600, 'fim do editor');

    const publish = page.getByRole('button', { name: /^Publicar$/i });
    await waitVisible(publish, 15_000, 'Publicar');
    await click(page, publish, 'Publicar');
    await waitUrl(page, /\/modelos\/?$/, 30_000, 'modelos após publicar');
    await waitVisible(
      page.getByRole('heading', { name: /Modelos de termo/i }),
      20_000,
      'lista após publicar'
    );
    await pause(page, 900, 'publicado');

    const termos = page.getByRole('link', { name: /^Termos$/i });
    await waitVisible(termos, 15_000, 'menu Termos');
    await click(page, termos, 'Termos');
    await waitUrl(page, /\/termos\/?$/, 20_000, 'lista de termos');
    await waitVisible(page.getByRole('heading', { name: 'Termos' }), 20_000, 'página Termos');

    const firstEye = page.getByRole('link', { name: 'Ver termo' }).first();
    await waitVisible(firstEye, 20_000, 'ícone olho do primeiro termo');
    await click(page, firstEye, 'abrir primeiro termo');
    await waitUrl(page, /\/termos\/[^/]+$/, 20_000, 'detalhe do termo');
    await waitVisible(page.getByRole('button', { name: /Baixar termo/i }), 20_000, 'detalhe');
    await pause(page, 800, 'termo aberto');

    await downloadTermPdf(page);

    const audit = page.locator('a').filter({ hasText: 'Histórico completo' });
    await waitVisible(audit, 15_000, 'Histórico completo');
    await click(page, audit, 'Histórico completo');
    await waitUrl(page, /\/termos\/[^/]+\/audit/, 20_000, 'histórico');
    await waitVisible(
      page.getByRole('heading', { name: /Histórico de auditoria/i }),
      20_000,
      'Histórico de auditoria'
    );
    await pause(page, 800, 'histórico aberto');

    await scrollRoundTrip(page, 'histórico');
    log('finish', `hold final ${fmtSec(holdMs)}`);
    await pause(page, holdMs, 'hold final');
  } finally {
    log('browser', 'fechando e salvando vídeo…');
    await closeAndSave();
  }
}

main().catch((err) => {
  console.error('\nFALHA:', err?.message || err);
  process.exit(1);
});
