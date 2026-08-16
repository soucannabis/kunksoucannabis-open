/**
 * Helpers compartilhados das demos gravadas do Admin (:4256).
 */
import {
  clickWithCursor,
  env,
  fmtSec,
  log,
  pause,
  typeOverDuration,
} from './demo-lib.mjs';

export const DEFAULT_ADMIN_URL = 'http://localhost:4256';
export const ADMIN_DEMO_EMAIL = 'admin@soucannabis.ong.br';
export const ADMIN_DEMO_PASSWORD = 'Admin@2026!';

/** Duração de cada trecho do scroll (4s descendo + 4s subindo). */
export const SCROLL_TRAVEL_MS = 4_000;
export const SCROLL_HOLD_MS = 3_000;
/** 1 = até o final da página (ida e volta). */
export const SCROLL_TARGET_RATIO = 1;

export function adminBaseUrl() {
  return env('DEMO_ADMIN_URL', env('E2E_ADMIN_URL', DEFAULT_ADMIN_URL)).replace(/\/$/, '');
}

export async function ensureAdminDemoUser() {
  const { ensureDemoAdminUser } = await import('../../kunk/e2e/helpers/db.js');
  log('setup', `garantindo Administrador ${ADMIN_DEMO_EMAIL}…`);
  await ensureDemoAdminUser();
  log('setup', 'Administrador OK');
}

/** Antes da parte 1: formulário público em modo claro. */
export async function ensureAdminDemoFormThemeLight() {
  const { ensureTriageFormThemeLight } = await import('../../kunk/e2e/helpers/db.js');
  log('setup', 'garantindo tema claro do formulário de triagem…');
  await ensureTriageFormThemeLight();
  log('setup', 'tema claro OK');
}

export async function snapshotAdminProfessionalTypes() {
  const { snapshotProfessionalTypes } = await import('../../kunk/e2e/helpers/db.js');
  return snapshotProfessionalTypes();
}

export async function restoreAdminProfessionalTypes(types) {
  const { restoreProfessionalTypes } = await import('../../kunk/e2e/helpers/db.js');
  log('setup', 'restaurando taxas dos tipos de profissional…');
  await restoreProfessionalTypes(types);
  log('setup', 'taxas restauradas');
}

/** Antes da parte 4: API desligada para o clique em habilitar aparecer no vídeo. */
export async function ensureAdminDemoApiAccessDisabled() {
  const { ensureApiAccessDisabled } = await import('../../kunk/e2e/helpers/db.js');
  log('setup', 'garantindo API desabilitada…');
  await ensureApiAccessDisabled();
  log('setup', 'API desabilitada OK');
}

export async function restoreAdminApiAccessDisabled() {
  const { ensureApiAccessDisabled } = await import('../../kunk/e2e/helpers/db.js');
  log('setup', 'desabilitando API após a demo…');
  await ensureApiAccessDisabled();
  log('setup', 'API desabilitada');
}

export async function waitVisible(locator, timeoutMs, label) {
  log('wait-el', `visível: ${label} | timeout=${fmtSec(timeoutMs)}`);
  await locator.waitFor({ state: 'visible', timeout: timeoutMs });
  log('wait-el', `✓ ${label}`);
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

export async function click(page, locator, label) {
  log('click', label);
  await clickWithCursor(locator);
  log('click', `✓ ${label}`);
}

/** Fecha modais de e-mail / armazenamento que aparecem no primeiro login. */
export async function dismissPrompts(page) {
  const emailDialog = page.getByRole('dialog', { name: 'Configurar módulo de e-mail' });
  if (await emailDialog.isVisible().catch(() => false)) {
    await click(
      page,
      emailDialog.getByRole('button', { name: 'Configurar depois' }),
      'Configurar depois (e-mail)'
    );
    await pause(page, 500, 'após dismiss e-mail');
  }
  const storageDialog = page.getByRole('dialog', { name: 'Configurar armazenamento' });
  if (await storageDialog.isVisible().catch(() => false)) {
    await click(page, storageDialog.getByRole('button', { name: 'Não' }), 'Não (armazenamento)');
    await pause(page, 500, 'após dismiss armazenamento');
  }
}

export async function loginAdmin(page, adminUrl = adminBaseUrl()) {
  log('step', `login Admin (${ADMIN_DEMO_EMAIL})`);
  await page.goto(`${adminUrl}/login`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });

  const email = page.getByLabel(/^E-mail$/i);
  const password = page.getByLabel(/^Senha$/i);
  const enter = page.getByRole('button', { name: /^Entrar$/i });

  await waitVisible(email, 20_000, 'campo E-mail');
  await waitVisible(password, 20_000, 'campo Senha');
  await pause(page, 1_200, 'tela de login Admin');

  await typeOverDuration(email, ADMIN_DEMO_EMAIL, 2_000, 'E-mail');
  await typeOverDuration(password, ADMIN_DEMO_PASSWORD, 1_400, 'Senha');
  await pause(page, 700, 'credenciais preenchidas');

  await click(page, enter, 'Entrar');
  await waitUrl(page, /\/(home|inicio|dados)/, 45_000, 'Admin autenticado');
  await pause(page, 900, 'após login');
  await dismissPrompts(page);
}

/**
 * Abre uma pasta do menu lateral se ainda estiver fechada.
 * @param {string|RegExp} label
 */
export async function openNavFold(page, label) {
  const name = typeof label === 'string' ? new RegExp(`^${label}$`, 'i') : label;
  const btn = page.getByRole('button', { name }).first();
  await waitVisible(btn, 15_000, `pasta ${String(label)}`);
  await revealNavItem(page, btn, `pasta ${String(label)}`);
  const expanded = await btn.getAttribute('aria-expanded');
  if (expanded === 'true') {
    log('step', `pasta ${String(label)} já aberta`);
    return;
  }
  await click(page, btn, `abrir pasta ${String(label)}`);
  await pause(page, 500, `pasta ${String(label)} aberta`);
}

/** Sidebar (aside) — evita ambiguidade com links no conteúdo. */
export function sideNav(page) {
  return page.getByRole('complementary');
}

/**
 * Mostra suavemente no vídeo um item do menu lateral que ficou fora da viewport.
 * O menu compartilha a rolagem do documento com o conteúdo principal.
 */
export async function revealNavItem(page, locator, label) {
  const needsScroll = await locator.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return rect.top < 80 || rect.bottom > window.innerHeight - 80;
  }).catch(() => false);
  if (!needsScroll) return;

  log('scroll', `menu → ${label}`);
  await locator.evaluate(
    async (el) => {
      const scroller = document.scrollingElement || document.documentElement;
      const from = scroller.scrollTop;
      const rect = el.getBoundingClientRect();
      const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      const target = Math.min(
        max,
        Math.max(0, from + rect.top - Math.max(80, (window.innerHeight - rect.height) / 2))
      );
      await new Promise((resolve) => {
        const started = performance.now();
        const step = (now) => {
          const progress = Math.min(1, (now - started) / 1_500);
          scroller.scrollTo({ top: from + (target - from) * progress, behavior: 'instant' });
          if (progress < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
    }
  );
  await pause(page, 500, `menu visível: ${label}`);
}

/**
 * Rola a janela (ou main) a velocidade constante até a fração alvo.
 */
async function scrollWindowFor(page, totalMs, direction, label, ratio = SCROLL_TARGET_RATIO) {
  const duration = Math.max(500, Number(totalMs) || 0);
  log('scroll', `${direction === 'down' ? '↓' : '↑'} ${label} em ${fmtSec(duration)}`);
  await page.evaluate(
    async ({ ms, dir, ratio: targetRatio }) => {
      const candidates = [
        document.scrollingElement,
        document.documentElement,
        document.body,
        document.querySelector('main.admin-main'),
        document.querySelector('main'),
      ].filter(Boolean);
      const scroller =
        candidates
          .filter((el) => el.scrollHeight > el.clientHeight + 8)
          .sort(
            (a, b) =>
              b.scrollHeight - b.clientHeight - (a.scrollHeight - a.clientHeight)
          )[0] || document.scrollingElement || document.documentElement;
      const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      const target = Math.round(max * Math.min(1, Math.max(0, targetRatio)));
      const from = dir === 'down' ? 0 : target;
      const to = dir === 'down' ? target : 0;
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
    },
    { ms: duration, dir: direction, ratio }
  );
  await pause(page, 300, `fim ${label}`);
}

export async function scrollPageTour(page, label, { ratio = SCROLL_TARGET_RATIO } = {}) {
  const max = await page.evaluate(() => {
    const main = document.querySelector('main.admin-main') || document.querySelector('main');
    const doc = document.scrollingElement || document.documentElement;
    const el =
      main && main.scrollHeight > main.clientHeight + 8 ? main : doc;
    return Math.max(0, el.scrollHeight - el.clientHeight);
  });
  if (max <= 24) {
    log('scroll', `${label} | quase sem rolagem (${max}px) — pausa curta`);
    await pause(page, 2_000, `${label} sem scroll`);
    return;
  }
  const where = ratio >= 0.99 ? 'fim' : `ratio=${ratio}`;
  log(
    'scroll',
    `${label} | rolável=${max}px | até ${where} | ${fmtSec(SCROLL_TRAVEL_MS)} ida/volta`
  );
  await scrollWindowFor(page, SCROLL_TRAVEL_MS, 'down', `${label} topo→${where}`, ratio);
  await pause(page, SCROLL_HOLD_MS, `${label} no ${where}`);
  await scrollWindowFor(page, SCROLL_TRAVEL_MS, 'up', `${label} ${where}→topo`, ratio);
}

/** Só desce até o fim (sem voltar) e segura `holdMs`. */
export async function scrollPageDown(page, label, { holdMs = SCROLL_HOLD_MS, ratio = SCROLL_TARGET_RATIO } = {}) {
  const max = await page.evaluate(() => {
    const main = document.querySelector('main.admin-main') || document.querySelector('main');
    const doc = document.scrollingElement || document.documentElement;
    const el =
      main && main.scrollHeight > main.clientHeight + 8 ? main : doc;
    return Math.max(0, el.scrollHeight - el.clientHeight);
  });
  if (max <= 24) {
    log('scroll', `${label} | quase sem rolagem (${max}px) — pausa`);
    await pause(page, holdMs, `${label} sem scroll`);
    return;
  }
  log('scroll', `${label} | ↓ até o fim (${max}px) + hold ${fmtSec(holdMs)}`);
  await scrollWindowFor(page, SCROLL_TRAVEL_MS, 'down', `${label} topo→fim`, ratio);
  await pause(page, holdMs, `${label} no fim`);
}

/**
 * Clica num link do menu (ou no conteúdo) e opcionalmente faz o tour de scroll.
 * @param {{ name?: string|RegExp, href?: string, role?: 'link'|'button', heading?: string|RegExp, inSidebar?: boolean, openFolds?: string[], scroll?: boolean }} opts
 */
export async function visitAndScroll(page, opts) {
  const {
    name,
    href,
    role = 'link',
    heading,
    inSidebar = true,
    openFolds = [],
    scroll = true,
  } = opts;

  for (const fold of openFolds) {
    await openNavFold(page, fold);
  }

  const scope = inSidebar ? sideNav(page) : page;
  let locator;
  if (href) {
    locator = scope.locator(`a[href="${href}"]`).first();
  } else {
    locator = scope
      .getByRole(role, {
        name: typeof name === 'string' ? new RegExp(`^${name}$`, 'i') : name,
      })
      .first();
  }

  const label = href || String(name);
  await waitVisible(locator, 20_000, `nav ${label}`);
  if (inSidebar) await revealNavItem(page, locator, `nav ${label}`);
  await click(page, locator, label);

  if (heading) {
    const h = page
      .getByRole('heading', {
        name: typeof heading === 'string' ? new RegExp(heading, 'i') : heading,
      })
      .first();
    await waitVisible(h, 30_000, `heading ${String(heading)}`);
  }
  await pause(page, 800, `página ${label}`);
  if (scroll) await scrollPageTour(page, label);
}

/**
 * Abre o shell de gravação e devolve helpers comuns.
 */
export async function startAdminDemo(partLabel, kind) {
  const {
    demoCommonEnv,
    demoKindOutDir,
    openDemoBrowser,
  } = await import('./demo-lib.mjs');

  const cfg = demoCommonEnv();
  const adminUrl = adminBaseUrl();
  const outDir = demoKindOutDir(kind, cfg.outDir);
  const holdMs = Number(process.env.DEMO_HOLD_MS || cfg.holdMs || 5_000);

  log('start', `════════════ Admin ${partLabel} ════════════`);
  log('start', `admin=${adminUrl} | hold=${fmtSec(holdMs)} | outDir=${outDir}`);

  await ensureAdminDemoUser();

  const browser = await openDemoBrowser({
    mobile: cfg.mobile,
    channel: cfg.channel,
    slowMo: cfg.slowMo,
    outDir,
    label: kind,
  });

  return { ...browser, cfg, adminUrl, outDir, holdMs };
}
