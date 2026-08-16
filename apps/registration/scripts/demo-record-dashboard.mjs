/**
 * Demo gravada: Dashboard analytics (/app/relatorios/dashboard).
 *
 * Fluxo:
 * 1. Login Acolhimento → abre o dashboard (aba Associados).
 * 2. Em cada aba (Associados → Atendimentos → Pedidos → Triagem):
 *    scroll até o fim e volta ao topo em 10s no total (5s↓ + 5s↑).
 * 3. Hold final 15s e encerra.
 *
 * Uso:
 *   npm run demo:dashboard
 */
import {
  clickWithCursor,
  demoCommonEnv,
  demoKindOutDir,
  fmtSec,
  log,
  openDemoBrowser,
  pause,
} from './demo-lib.mjs';
import {
  ensureOperator,
  kunkBaseUrl,
  loginOperator,
  operatorCredentials,
  waitUrl,
  waitVisible,
} from './demo-triagem-shared.mjs';

const TABS = [
  { label: 'Associados', lastBlock: 'Associados por estado' },
  { label: 'Atendimentos', lastBlock: 'Associados com mais atendimentos' },
  { label: 'Pedidos', lastBlock: 'Produtos mais vendidos' },
  { label: 'Triagem', lastBlock: 'Triagens por usuário Kunk' },
];
/** Cada ciclo fim↔topo dura 10s (metade descendo, metade subindo). */
const ROUND_TRIP_MS = 10_000;

async function click(page, locator, label) {
  log('click', label);
  await clickWithCursor(locator);
  log('click', `✓ ${label}`);
}

/** Velocidade do scroll no vídeo — abas curtas precisam de movimento perceptível. */
const SCROLL_SPEED_PX_PER_SEC = 320;
const SCROLL_MIN_MS = 900;
const SCROLL_MAX_MS = 4500;

async function scrollableHeight(page) {
  return page.evaluate(() => {
    const doc = document.scrollingElement || document.documentElement;
    return Math.max(0, doc.scrollHeight - doc.clientHeight);
  });
}

async function scrollWindowFor(page, totalMs, direction, label) {
  const duration = Math.max(500, Number(totalMs) || 0);
  log('scroll', `${direction === 'down' ? '↓' : '↑'} página ${label} em ${fmtSec(duration)}`);
  const moved = await page.evaluate(
    async ({ ms, dir }) => {
      const doc = document.scrollingElement || document.documentElement;
      // A página é o scroller natural do Kunk. Só caímos para um container
      // interno se o documento não rolar — e nunca para painéis recolhidos
      // (MuiCollapse), que têm scrollHeight grande mas estão invisíveis.
      const innerScroller = () => {
        const main = document.querySelector('main') || document.body;
        return [...main.querySelectorAll('*')]
          .filter((el) => {
            if (el.scrollHeight - el.clientHeight <= 8) return false;
            const style = getComputedStyle(el);
            if (!/(auto|scroll)/.test(style.overflowY)) return false;
            return el.getClientRects().length > 0;
          })
          .sort(
            (a, b) =>
              b.scrollHeight - b.clientHeight - (a.scrollHeight - a.clientHeight)
          )[0];
      };
      const scroller =
        doc.scrollHeight - doc.clientHeight > 8 ? doc : innerScroller() || doc;
      const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      const from = dir === 'down' ? 0 : max;
      const to = dir === 'down' ? max : 0;
      scroller.scrollTo({ top: from, behavior: 'instant' });

      const ease = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
      await new Promise((resolve) => {
        const begun = performance.now();
        const step = () => {
          const progress = Math.min(1, (performance.now() - begun) / ms);
          scroller.scrollTo({
            top: from + (to - from) * ease(progress),
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

/**
 * Desce até o fim e volta ao topo dentro de `totalMs`.
 *
 * O movimento usa velocidade fixa (não duração fixa): abas curtas como Triagem
 * rolam poucos pixels e, esticados por 5s, pareciam paradas no vídeo. O tempo
 * que sobra vira pausa no fim e no topo, mantendo os 10s por aba.
 */
async function scrollRoundTrip(page, totalMs, label) {
  const max = await scrollableHeight(page);
  const travelMs = Math.min(
    SCROLL_MAX_MS,
    Math.max(SCROLL_MIN_MS, Math.round((max / SCROLL_SPEED_PX_PER_SEC) * 1000))
  );
  const idle = Math.max(0, Number(totalMs) - travelMs * 2);
  const holdBottom = Math.round(idle * 0.6);
  const holdTop = idle - holdBottom;
  log(
    'scroll',
    `${label} | rolável=${max}px | trajeto=${fmtSec(travelMs)} ida e volta | ` +
      `pausas fim=${fmtSec(holdBottom)} topo=${fmtSec(holdTop)}`
  );

  await scrollWindowFor(page, travelMs, 'down', `${label} topo ao fim`);
  if (holdBottom) await pause(page, holdBottom, `${label} no fim da página`);
  await scrollWindowFor(page, travelMs, 'up', `${label} fim ao topo`);
  if (holdTop) await pause(page, holdTop, `${label} de volta ao topo`);
}

async function waitTabContentReady(page, tabLabel, lastBlock) {
  const selectedTab = page.getByRole('tab', {
    name: new RegExp(`^${tabLabel}$`, 'i'),
    selected: true,
  });
  await waitVisible(selectedTab, 15_000, `aba ${tabLabel} selecionada`);
  await waitVisible(
    page.getByText(lastBlock, { exact: true }).first(),
    30_000,
    `último bloco de ${tabLabel}`
  );
  await page
    .getByRole('progressbar')
    .first()
    .waitFor({ state: 'hidden', timeout: 45_000 })
    .catch(() => null);
  await pause(page, 1500, `conteúdo ${tabLabel} estabilizado`);
}

async function openDashboard(page, kunkUrl) {
  const url = `${kunkUrl}/app/relatorios/dashboard`;
  log('goto', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await waitUrl(page, /\/app\/relatorios\/dashboard/, 30_000, 'dashboard');
  await waitVisible(
    page.locator('h1').filter({ hasText: /^Dashboard$/i }),
    30_000,
    'título Dashboard'
  );
  await waitVisible(
    page.getByRole('tab', { name: /^Associados$/i }),
    20_000,
    'aba Associados'
  );
  await waitTabContentReady(page, 'Associados', 'Associados por estado');
}

async function selectTab(page, tabLabel, lastBlock) {
  const tab = page.getByRole('tab', { name: new RegExp(`^${tabLabel}$`, 'i') });
  await waitVisible(tab, 15_000, `aba ${tabLabel}`);
  const selected = await tab.getAttribute('aria-selected');
  if (selected === 'true') {
    log('step', `aba ${tabLabel} já selecionada`);
    await waitTabContentReady(page, tabLabel, lastBlock);
    return;
  }
  await click(page, tab, `aba ${tabLabel}`);
  await waitTabContentReady(page, tabLabel, lastBlock);
}

async function main() {
  const cfg = demoCommonEnv();
  const kunkUrl = kunkBaseUrl();
  const op = operatorCredentials();
  const outDir = demoKindOutDir('dashboard', cfg.outDir);
  const holdMs = Number(process.env.DEMO_HOLD_MS || cfg.holdMs || 15_000);

  log('start', '════════════ dashboard analytics ════════════');
  log(
    'start',
    `kunk=${kunkUrl} | roundTrip=${fmtSec(ROUND_TRIP_MS)} | hold=${fmtSec(holdMs)} | outDir=${outDir}`
  );

  await ensureOperator();

  const { page, closeAndSave } = await openDemoBrowser({
    mobile: cfg.mobile,
    channel: cfg.channel,
    slowMo: cfg.slowMo,
    outDir,
    label: 'dashboard',
  });

  try {
    await loginOperator(page, kunkUrl, op.email, op.password, {
      landingPattern: /\/app\//,
    });
    await openDashboard(page, kunkUrl);

    for (const { label: tabLabel, lastBlock } of TABS) {
      log('step', `aba ${tabLabel} — scroll ida/volta ${fmtSec(ROUND_TRIP_MS)}`);
      await selectTab(page, tabLabel, lastBlock);
      await scrollRoundTrip(page, ROUND_TRIP_MS, tabLabel);
    }

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
