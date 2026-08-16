/**
 * Helpers compartilhados das demos gravadas (Edge + perfil limpo + vídeo).
 *
 * Padrão espelhado de appSoucannabis/web/scripts/demo-lib.mjs:
 * - channel msedge, perfil temp limpo
 * - desktop 1366×768 (viewport + recordVideo.size)
 * - mobile: viewport null + medir inner real antes do recordVideo
 */
import { chromium, devices } from '@playwright/test';
import {
  mkdirSync,
  renameSync,
  existsSync,
  rmSync,
  mkdtempSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = join(__dirname, '..');

export const DEFAULT_APP_URL = 'http://localhost:4255';

export function env(name, fallback = '') {
  const v = process.env[name];
  return v == null || v === '' ? fallback : String(v).trim();
}

export function demoCommonEnv() {
  const mobile =
    process.argv.includes('--mobile') || process.env.DEMO_FORMAT === 'mobile';
  return {
    mobile,
    channel: env('DEMO_CHANNEL', 'msedge'),
    outDir: env('DEMO_OUT_DIR', join(APP_ROOT, 'demos', 'output')),
    slowMo: Number(env('DEMO_SLOW_MO', '350')),
    holdMs: Number(env('DEMO_HOLD_MS', '15000')),
    password: env('DEMO_PASSWORD', env('E2E_PASSWORD', 'senha123')),
    appUrl: env('DEMO_APP_URL', env('E2E_FRONT_URL', DEFAULT_APP_URL)).replace(
      /\/$/,
      ''
    ),
  };
}

/** Subpasta por tipo de demo (ex.: cadastro). */
export function demoKindOutDir(kind, baseOutDir) {
  const base =
    baseOutDir || env('DEMO_OUT_DIR', join(APP_ROOT, 'demos', 'output'));
  return join(base, kind);
}

export function log(step, detail = '') {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${step}${detail ? ` — ${detail}` : ''}`);
}

/** Formata ms como segundos (ex.: 1200 → "1.2s"). */
export function fmtSec(ms) {
  const n = Number(ms) || 0;
  return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}s`;
}

/** Escapa valor para log (aspas + trunca textos longos). */
export function fmtValue(value, { max = 120 } = {}) {
  const s = String(value ?? '');
  const shown = s.length > max ? `${s.slice(0, max)}…(+${s.length - max})` : s;
  return JSON.stringify(shown);
}

export function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

export function uniqueEmail(prefix = 'demo') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.local`;
}

/**
 * Cursor visual gravado junto com a página. O cursor nativo do SO não aparece
 * no vídeo do Playwright, então usamos um overlay que sobrevive às navegações
 * por meio de context.addInitScript().
 */
function installDemoCursor() {
  const mount = () => {
    if (document.querySelector('[data-kunk-demo-cursor]')) return;

    const style = document.createElement('style');
    style.dataset.kunkDemoCursorStyle = '';
    style.textContent = `
      [data-kunk-demo-cursor] {
        position: fixed;
        left: 0;
        top: 0;
        width: 30px;
        height: 38px;
        pointer-events: none;
        z-index: 2147483647;
        opacity: 0;
        transform: translate3d(20px, 20px, 0);
        transition:
          transform var(--kunk-demo-cursor-duration, 180ms)
          cubic-bezier(.22, .8, .25, 1),
          opacity 120ms ease;
        filter: drop-shadow(0 2px 2px rgba(0, 0, 0, .45));
      }
      [data-kunk-demo-cursor].is-visible { opacity: 1; }
      [data-kunk-demo-cursor] svg {
        display: block;
        width: 24px;
        height: 30px;
        overflow: visible;
      }
      [data-kunk-demo-cursor-ring] {
        position: absolute;
        left: 1px;
        top: 1px;
        width: 12px;
        height: 12px;
        border: 3px solid #16a34a;
        border-radius: 999px;
        opacity: 0;
        transform: translate(-50%, -50%) scale(.35);
      }
      [data-kunk-demo-cursor].is-clicking [data-kunk-demo-cursor-ring] {
        animation: kunk-demo-cursor-click 420ms ease-out;
      }
      @keyframes kunk-demo-cursor-click {
        0% { opacity: .95; transform: translate(-50%, -50%) scale(.35); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(2.6); }
      }
    `;

    const cursor = document.createElement('div');
    cursor.dataset.kunkDemoCursor = '';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = `
      <svg viewBox="0 0 24 30" aria-hidden="true">
        <path
          d="M2 1.5v22.4l5.35-5.1 3.8 8.25 4.4-2.05-3.8-8.15h7.45L2 1.5Z"
          fill="#fff"
          stroke="#111827"
          stroke-width="2.2"
          stroke-linejoin="round"
        />
      </svg>
      <span data-kunk-demo-cursor-ring></span>
    `;

    document.documentElement.append(style, cursor);
  };

  if (document.documentElement) mount();
  else document.addEventListener('DOMContentLoaded', mount, { once: true });
}

export async function fitBrowserWindow(page, { width, height }) {
  try {
    const client = await page.context().newCDPSession(page);
    const { windowId } = await client.send('Browser.getWindowForTarget');
    await client.send('Browser.setWindowBounds', {
      windowId,
      bounds: { width, height, windowState: 'normal' },
    });
    await page.waitForTimeout(300);
  } catch (err) {
    log('warn', `ajustar janela: ${err?.message || err}`);
  }
}

function baseLaunchOpts({ channel, slowMo, windowOuter, mobile, device }) {
  return {
    headless: false,
    slowMo,
    channel,
    locale: 'pt-BR',
    ignoreDefaultArgs: [
      '--enable-automation',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      `--window-size=${windowOuter.width},${windowOuter.height}`,
      '--window-position=40,40',
    ],
    ...(mobile
      ? {
          viewport: null,
          userAgent: device.userAgent,
          hasTouch: true,
        }
      : {
          viewport: { width: 1366, height: 768 },
        }),
  };
}

async function measureMobileViewport(profileDir, opts) {
  const ctx = await chromium.launchPersistentContext(profileDir, {
    ...baseLaunchOpts(opts),
    slowMo: 0,
  });
  try {
    const page = ctx.pages()[0] || (await ctx.newPage());
    await fitBrowserWindow(page, opts.windowOuter);
    await page.waitForTimeout(500);
    const inner = await page.evaluate(() => ({
      w: window.innerWidth,
      h: window.innerHeight,
    }));
    return { width: inner.w, height: inner.h };
  } finally {
    await ctx.close();
  }
}

/**
 * Abre Edge limpo com gravação.
 * Retorna { context, page, profileDir, format, videoSize, closeAndSave }.
 */
export async function openDemoBrowser({
  mobile,
  channel,
  slowMo,
  outDir,
  label = 'demo',
}) {
  mkdirSync(outDir, { recursive: true });
  const profileDir = mkdtempSync(join(tmpdir(), `kunk-demo-${label}-`));
  log('browser-profile', `limpo: ${profileDir}`);

  const desktopViewport = { width: 1366, height: 768 };
  const device = devices['Pixel 7'];
  const format = mobile ? 'mobile' : 'desktop';
  let windowOuter = mobile
    ? { width: 390, height: 944 }
    : { width: desktopViewport.width, height: desktopViewport.height + 100 };
  let videoSize = desktopViewport;

  const launchBase = { channel, slowMo, windowOuter, mobile, device };

  if (mobile) {
    log('measure', 'medindo viewport real do Edge…');
    videoSize = await measureMobileViewport(profileDir, launchBase);
    log('measure', `videoSize=${videoSize.width}x${videoSize.height}`);
  }

  const context = await chromium.launchPersistentContext(profileDir, {
    ...baseLaunchOpts(launchBase),
    recordVideo: { dir: outDir, size: videoSize },
  });

  await context.addInitScript(installDemoCursor);
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = context.pages()[0] || (await context.newPage());
  await page.evaluate(installDemoCursor);
  if (mobile) {
    await fitBrowserWindow(page, windowOuter);
    const inner = await page.evaluate(() => ({
      w: window.innerWidth,
      h: window.innerHeight,
    }));
    log(
      'window',
      `inner=${inner.w}x${inner.h} video=${videoSize.width}x${videoSize.height}`
    );
    if (inner.w !== videoSize.width || inner.h !== videoSize.height) {
      log(
        'warn',
        'inner ≠ videoSize — pode haver letterbox; considerando tamanhos atuais'
      );
    }
  }

  async function closeAndSave() {
    const videoPath = await page.video()?.path();
    await context.close();
    try {
      rmSync(profileDir, { recursive: true, force: true });
      log('browser-profile', 'removido');
    } catch {
      /* ignore */
    }
    if (videoPath && existsSync(videoPath)) {
      const dest = join(outDir, `${format}-${stamp()}.webm`);
      renameSync(videoPath, dest);
      console.log(`\nOK — vídeo salvo em:\n  ${dest}\n`);
      return dest;
    }
    console.log('\nAVISO — arquivo de vídeo não encontrado.\n');
    return null;
  }

  return { context, page, profileDir, format, videoSize, closeAndSave };
}

/** Move o cursor visual suavemente até o centro de um locator. */
export async function moveDemoCursorTo(
  locator,
  { durationMs = 180, settleMs = 30 } = {}
) {
  await locator.waitFor({ state: 'visible', timeout: 30_000 });
  await locator.scrollIntoViewIfNeeded().catch(() => null);
  const box = await locator.boundingBox();
  if (!box) throw new Error('Não foi possível posicionar o cursor no elemento');

  const page = locator.page();
  const point = {
    x: Math.round(box.x + box.width / 2),
    y: Math.round(box.y + box.height / 2),
    durationMs,
  };
  await page.evaluate(installDemoCursor);
  await page.evaluate(({ x, y, durationMs: duration }) => {
    const cursor = document.querySelector('[data-kunk-demo-cursor]');
    if (!cursor) return;
    cursor.style.setProperty('--kunk-demo-cursor-duration', `${duration}ms`);
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    cursor.classList.add('is-visible');
  }, point);
  await page.waitForTimeout(durationMs + settleMs);
}

/** Exibe um anel no ponto atual para tornar o clique perceptível no vídeo. */
export async function pulseDemoCursor(page, durationMs = 90) {
  await page.evaluate(() => {
    const cursor = document.querySelector('[data-kunk-demo-cursor]');
    if (!cursor) return;
    cursor.classList.remove('is-clicking');
    void cursor.offsetWidth;
    cursor.classList.add('is-clicking');
  });
  await page.waitForTimeout(durationMs);
}

/** Move o cursor, mostra o feedback visual e executa o clique real. */
export async function clickWithCursor(locator, options = {}) {
  const {
    durationMs = 180,
    settleMs = 30,
    pulseMs = 90,
    ...clickOpts
  } = options;
  await moveDemoCursorTo(locator, { durationMs, settleMs });
  await pulseDemoCursor(locator.page(), pulseMs);
  await locator.click(clickOpts);
}

/** Equivalente visual de locator.check(). */
export async function checkWithCursor(locator, options = {}) {
  const {
    durationMs = 180,
    settleMs = 30,
    pulseMs = 90,
    ...checkOpts
  } = options;
  await moveDemoCursorTo(locator, { durationMs, settleMs });
  await pulseDemoCursor(locator.page(), pulseMs);
  await locator.check(checkOpts);
}

/**
 * Simula abrir um <select>, mostrar as opções e escolher uma com o cursor.
 * O menu nativo do SO quase nunca aparece no vídeo do Playwright; por isso
 * renderizamos um dropdown visual alinhado ao campo.
 *
 * @param {import('@playwright/test').Locator} locator
 * @param {string|{value?: string, label?: string}} valueOrOpts
 */
export async function selectOptionWithCursor(
  locator,
  valueOrOpts,
  {
    openHoldMs = 750,
    afterMs = 350,
    label = '',
    durationMs = 180,
    settleMs = 30,
    pulseMs = 90,
  } = {}
) {
  const page = locator.page();
  await locator.waitFor({ state: 'visible', timeout: 30_000 });
  await locator.scrollIntoViewIfNeeded().catch(() => null);

  const wanted =
    valueOrOpts && typeof valueOrOpts === 'object'
      ? {
          value: valueOrOpts.value != null ? String(valueOrOpts.value) : null,
          label: valueOrOpts.label != null ? String(valueOrOpts.label) : null,
        }
      : { value: String(valueOrOpts), label: String(valueOrOpts) };

  const options = await locator.evaluate((el) =>
    [...el.options].map((o, index) => ({
      value: o.value,
      label: String(o.label || o.textContent || '').trim(),
      disabled: Boolean(o.disabled),
      index,
    }))
  );

  const match = options.find((o) => {
    if (o.disabled) return false;
    if (wanted.value != null && o.value === wanted.value) return true;
    if (wanted.label != null && o.label === wanted.label) return true;
    return false;
  });
  if (!match) {
    const field = label || 'select';
    throw new Error(
      `Opção não encontrada em ${field}: ${fmtValue(wanted.value ?? wanted.label)}`
    );
  }

  const field = label || 'select';
  log('select', `${field} abrir → ${fmtValue(match.label || match.value)}`);

  // Clique visual no campo (sem abrir o picker nativo, que não grava no vídeo).
  await moveDemoCursorTo(locator, { durationMs, settleMs });
  await pulseDemoCursor(page, pulseMs);

  await locator.evaluate(
    (el, { matchValue, matchLabel }) => {
      document.querySelector('[data-kunk-demo-select-menu]')?.remove();
      document
        .querySelectorAll('[data-kunk-demo-select-open]')
        .forEach((node) => node.removeAttribute('data-kunk-demo-select-open'));
      el.setAttribute('data-kunk-demo-select-open', '1');

      const rect = el.getBoundingClientRect();
      const menu = document.createElement('div');
      menu.dataset.kunkDemoSelectMenu = '';
      Object.assign(menu.style, {
        position: 'fixed',
        left: `${Math.round(rect.left)}px`,
        top: `${Math.round(rect.bottom + 4)}px`,
        minWidth: `${Math.max(Math.round(rect.width), 160)}px`,
        maxWidth: 'min(420px, calc(100vw - 16px))',
        maxHeight: '240px',
        overflowY: 'auto',
        background: '#fff',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        boxShadow: '0 12px 28px rgba(15, 23, 42, .18)',
        zIndex: '2147483646',
        padding: '6px 0',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        fontSize: '14px',
        color: '#0f172a',
      });

      for (const opt of el.options) {
        const text = String(opt.label || opt.textContent || '').trim();
        if (!text && !opt.value) continue;
        const item = document.createElement('div');
        item.dataset.kunkDemoSelectOption = '';
        item.textContent = text || opt.value;
        Object.assign(item.style, {
          padding: '8px 12px',
          cursor: 'default',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          background: 'transparent',
        });
        if (opt.disabled || !opt.value) {
          item.style.color = '#94a3b8';
        }
        const isTarget =
          opt.value === matchValue ||
          text === matchLabel ||
          text === matchValue;
        if (isTarget) {
          item.dataset.kunkDemoSelectTarget = '';
          item.style.background = '#ecfdf5';
          item.style.color = '#166534';
          item.style.fontWeight = '600';
        }
        menu.appendChild(item);
      }

      document.documentElement.appendChild(menu);

      const target = menu.querySelector('[data-kunk-demo-select-target]');
      if (target) target.scrollIntoView({ block: 'nearest' });

      const m = menu.getBoundingClientRect();
      if (m.bottom > window.innerHeight - 8) {
        menu.style.top = `${Math.max(8, Math.round(rect.top - m.height - 4))}px`;
      }
      if (m.right > window.innerWidth - 8) {
        menu.style.left = `${Math.max(
          8,
          Math.round(window.innerWidth - m.width - 8)
        )}px`;
      }
    },
    { matchValue: match.value, matchLabel: match.label }
  );

  await page.waitForTimeout(openHoldMs);

  const target = page.locator('[data-kunk-demo-select-target]').first();
  await target.waitFor({ state: 'visible', timeout: 5_000 });
  await target.evaluate((el) => el.scrollIntoView({ block: 'nearest' }));
  await moveDemoCursorTo(target, { durationMs, settleMs });
  await pulseDemoCursor(page, pulseMs);

  await locator.selectOption(match.value);
  log('select', `${field} ✓ ${fmtValue(match.label || match.value)}`);

  await page.evaluate(() => {
    document.querySelector('[data-kunk-demo-select-menu]')?.remove();
    document
      .querySelectorAll('[data-kunk-demo-select-open]')
      .forEach((node) => node.removeAttribute('data-kunk-demo-select-open'));
  });
  await page.waitForTimeout(afterMs);
}

/**
 * Digita caractere a caractere distribuindo `totalMs` entre todos os chars.
 * @param {{ label?: string }} [opts] — se totalMs for número (API antiga), label via 4º arg implícito
 */
export async function typeOverDuration(
  locator,
  text,
  totalMs,
  label = '',
  cursorOpts = {}
) {
  const chars = [...String(text)];
  if (chars.length === 0) return;
  const delay = Math.max(20, Math.floor(totalMs / chars.length));
  const field = label || 'campo';
  log(
    'type',
    `${field} = ${fmtValue(text)} (${chars.length} chars, ${fmtSec(totalMs)}, ${delay}ms/char)`
  );
  await clickWithCursor(locator, cursorOpts);
  await locator.fill('');
  await locator.pressSequentially(String(text), { delay });
  log('type', `${field} ✓ digitado`);
}

/** Preenche input/select/textarea com digitação visível quando possível. */
export async function typeInto(
  locator,
  text,
  { totalMs = 1200, label = '', durationMs, settleMs, pulseMs } = {}
) {
  await locator.waitFor({ state: 'visible', timeout: 30_000 });
  await locator.scrollIntoViewIfNeeded().catch(() => null);
  const tag = await locator.evaluate((el) => el.tagName.toLowerCase());
  const field = label || tag;
  const cursorOpts = {};
  if (durationMs != null) cursorOpts.durationMs = durationMs;
  if (settleMs != null) cursorOpts.settleMs = settleMs;
  if (pulseMs != null) cursorOpts.pulseMs = pulseMs;
  if (tag === 'select') {
    await selectOptionWithCursor(locator, String(text), {
      label: field,
      ...cursorOpts,
    });
    return;
  }
  await typeOverDuration(locator, text, totalMs, field, cursorOpts);
}

/**
 * Rola um pouco para baixo (suave) — útil para revelar os próximos campos na demo.
 * @param {{ amount?: number, ratio?: number, pauseMs?: number, label?: string }} [opts]
 *   amount — px fixos; se omitido, usa ratio * innerHeight (default 0.35)
 */
export async function scrollDownABit(
  page,
  { amount, ratio = 0.35, pauseMs = 600, label = '' } = {}
) {
  if (page.isClosed()) return;
  const where = label ? ` (${label})` : '';
  const before = await page.evaluate(() => Math.round(window.scrollY || 0));
  const delta = await page.evaluate(
    ({ amount: px, ratio: r }) => {
      const step =
        px != null && px > 0
          ? Math.round(px)
          : Math.max(80, Math.round(window.innerHeight * r));
      window.scrollBy({ top: step, behavior: 'smooth' });
      return step;
    },
    { amount: amount ?? null, ratio }
  );
  log(
    'scroll',
    `↓ +${delta}px${where} | y=${before} → ~${before + delta} | hold=${fmtSec(pauseMs)}`
  );
  await page.waitForTimeout(pauseMs);
  const after = await page.evaluate(() => Math.round(window.scrollY || 0));
  log('scroll', `✓${where} | y=${after}`);
}

/**
 * Rola a página até o fim (suave) e pausa para a demo mostrar o conteúdo.
 * @param {{ pauseMs?: number, stepRatio?: number, stepDelayMs?: number, label?: string }} [opts]
 *   stepRatio — fração da viewport por passo (menor = mais lento; default 0.55)
 *   stepDelayMs — espera entre passos (maior = mais lento; default 280)
 */
export async function scrollPageToBottom(
  page,
  { pauseMs = 1800, stepRatio = 0.55, stepDelayMs = 280, label = '' } = {}
) {
  if (page.isClosed()) return;
  const where = label ? ` (${label})` : '';
  const before = await page.evaluate(() => ({
    y: Math.round(window.scrollY || 0),
    vh: window.innerHeight,
    max: Math.max(
      document.body?.scrollHeight || 0,
      document.documentElement?.scrollHeight || 0
    ),
  }));
  const stepPx = Math.max(80, Math.round(before.vh * stepRatio));
  const approxSteps = Math.max(
    1,
    Math.ceil(Math.max(0, before.max - before.y - before.vh) / stepPx)
  );
  log(
    'scroll',
    `↓ até o fim${where} | y=${before.y} → ~${before.max} | step=${stepPx}px ` +
      `(ratio=${stepRatio}) × ~${approxSteps} | delay=${fmtSec(stepDelayMs)}/passo | hold=${fmtSec(pauseMs)}`
  );
  await page.evaluate(
    async ({ stepRatio: ratio, stepDelayMs: delay }) => {
      const step = Math.max(80, Math.round(window.innerHeight * ratio));
      const max = Math.max(
        document.body?.scrollHeight || 0,
        document.documentElement?.scrollHeight || 0
      );
      let y = window.scrollY || 0;
      while (y + window.innerHeight < max - 8) {
        y = Math.min(y + step, max);
        window.scrollTo({ top: y, behavior: 'smooth' });
        await new Promise((r) => setTimeout(r, delay));
      }
      window.scrollTo({
        top: Math.max(
          document.body?.scrollHeight || 0,
          document.documentElement?.scrollHeight || 0
        ),
        behavior: 'smooth',
      });
    },
    { stepRatio, stepDelayMs }
  );
  await page.waitForTimeout(pauseMs);
  const after = await page.evaluate(() => Math.round(window.scrollY || 0));
  log('scroll', `✓ fim${where} | y=${after}`);
}

/**
 * Rola a página até o topo (suave) e pausa.
 * @param {{ pauseMs?: number, stepRatio?: number, stepDelayMs?: number, label?: string }} [opts]
 */
export async function scrollPageToTop(
  page,
  { pauseMs = 1200, stepRatio = 0.55, stepDelayMs = 280, label = '' } = {}
) {
  if (page.isClosed()) return;
  const where = label ? ` (${label})` : '';
  const before = await page.evaluate(() => ({
    y: Math.round(window.scrollY || 0),
    vh: window.innerHeight,
  }));
  const stepPx = Math.max(80, Math.round(before.vh * stepRatio));
  const approxSteps = Math.max(1, Math.ceil(before.y / stepPx));
  log(
    'scroll',
    `↑ até o topo${where} | y=${before.y} → 0 | step=${stepPx}px ` +
      `(ratio=${stepRatio}) × ~${approxSteps} | delay=${fmtSec(stepDelayMs)}/passo | hold=${fmtSec(pauseMs)}`
  );
  await page.evaluate(
    async ({ stepRatio: ratio, stepDelayMs: delay }) => {
      const step = Math.max(80, Math.round(window.innerHeight * ratio));
      let y = window.scrollY || 0;
      while (y > 8) {
        y = Math.max(0, y - step);
        window.scrollTo({ top: y, behavior: 'smooth' });
        await new Promise((r) => setTimeout(r, delay));
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    { stepRatio, stepDelayMs }
  );
  await page.waitForTimeout(pauseMs);
  const after = await page.evaluate(() => Math.round(window.scrollY || 0));
  log('scroll', `✓ topo${where} | y=${after}`);
}

/**
 * Pausa explícita da demo.
 * @param {string} [reason]
 */
export async function pause(page, ms, reason = '') {
  if (page.isClosed()) return;
  const why = reason ? ` (${reason})` : '';
  log('wait', `${fmtSec(ms)}${why}`);
  await page.waitForTimeout(ms);
}
