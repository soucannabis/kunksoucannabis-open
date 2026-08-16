/**
 * Demo gravada: relatório de serviços com contestação (staff ↔ portal Marina).
 *
 * Fluxo:
 * 1. Login Acolhimento → /app/relatorios/servicos → scroll fim/topo → logout.
 * 2. Login Marina → portal: contesta Iris (faltam dados) e valida Karen (Sim).
 * 3. Logout → staff: Abrir atendimento Iris, preço 100, salvar.
 * 4. Volta ao relatório → ícone de contestação → Resolver → hold 10s.
 *
 * Uso:
 *   DEMO_PROFESSIONAL_EMAIL=profissional@soucannabis.ong.br \
 *   DEMO_PROFESSIONAL_PASSWORD='Marina@2026!' \
 *   npm run demo:relatorio-servicos
 */
import {
  clickWithCursor,
  demoCommonEnv,
  demoKindOutDir,
  env,
  fmtSec,
  log,
  moveDemoCursorTo,
  openDemoBrowser,
  pause,
  typeOverDuration,
} from './demo-lib.mjs';
import { clickSidebarItem } from './demo-sidebar.mjs';
import {
  ensureOperator,
  kunkBaseUrl,
  loginOperator,
  operatorCredentials,
  waitUrl,
  waitVisible,
} from './demo-triagem-shared.mjs';

const CONTEST_TEXT =
  'O atendimento de Iris Yamamoto é consulta de retorno, o valor está errado.';

async function click(page, locator, label) {
  log('click', label);
  await clickWithCursor(locator);
  log('click', `✓ ${label}`);
}

function professionalCredentials() {
  return {
    email: env('DEMO_PROFESSIONAL_EMAIL', 'profissional@soucannabis.ong.br'),
    password: env('DEMO_PROFESSIONAL_PASSWORD', 'Marina@2026!'),
  };
}

async function ensureProfessional() {
  try {
    const { ensureProfessionalUser } = await import('../../kunk/e2e/helpers/db.js');
    log('setup', 'garantindo usuário Profissional Marina no banco…');
    await ensureProfessionalUser(professionalCredentials());
    log('setup', 'usuário Profissional OK');
  } catch (err) {
    log(
      'warn',
      `ensureProfessionalUser falhou (${err?.message || err}) — seguindo se o usuário já existir`
    );
  }
}

async function scrollWindowFor(page, totalMs, direction, label) {
  const duration = Math.max(500, Number(totalMs) || 0);
  log('scroll', `${direction === 'down' ? '↓' : '↑'} página ${label} em ${fmtSec(duration)}`);
  await page.evaluate(
    async ({ ms, dir }) => {
      const candidates = [document.scrollingElement, document.documentElement, document.body].filter(
        Boolean
      );
      const main = document.querySelector('main, [class*="Content"], .MuiBox-root');
      if (main) candidates.push(main, ...main.querySelectorAll('*'));
      const scroller =
        candidates
          .filter((el) => el && el.scrollHeight > el.clientHeight + 8)
          .sort((a, b) => b.scrollHeight - b.clientHeight - (a.scrollHeight - a.clientHeight))[0] ||
        document.scrollingElement ||
        document.documentElement;
      const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      const from = dir === 'down' ? 0 : max;
      const to = dir === 'down' ? max : 0;
      scroller.scrollTo({ top: from, behavior: 'instant' });

      const ease = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
      await new Promise((resolve) => {
        const begun = performance.now();
        const step = () => {
          const progress = Math.min(1, (performance.now() - begun) / ms);
          scroller.scrollTo({ top: from + (to - from) * ease(progress), behavior: 'instant' });
          if (progress >= 1) {
            resolve();
            return;
          }
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    },
    { ms: duration, dir: direction }
  );
  await pause(page, 600, `fim ${label}`);
}

async function openStaffReport(page, kunkUrl) {
  const url = `${kunkUrl}/app/relatorios/servicos`;
  log('goto', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await waitUrl(page, /\/app\/relatorios\/servicos/, 30_000, 'relatório staff');
  await waitVisible(
    page.locator('h1').filter({ hasText: /Relatório de atendimentos/i }),
    30_000,
    'título relatório'
  );
  await waitVisible(
    page.getByText(/Agrupado por mês e profissional/i).first(),
    30_000,
    'relatório carregado'
  );
}

async function logoutStaff(page, kunkUrl) {
  const sair = page.getByRole('button', { name: 'Sair' });
  await waitVisible(sair, 20_000, 'Sair (sidebar)');
  await click(page, sair, 'Sair (staff)');
  await waitUrl(page, /\/login/, 30_000, 'login após logout staff');
  await pause(page, 700, 'tela de login');
  if (!page.url().includes('/login')) {
    await page.goto(`${kunkUrl}/login`, { waitUntil: 'domcontentloaded' });
  }
}

async function logoutPortal(page, kunkUrl) {
  const sair = page.getByRole('button', { name: /^Sair$/i });
  await waitVisible(sair, 20_000, 'Sair (portal)');
  await click(page, sair, 'Sair (portal)');
  await waitUrl(page, /\/login/, 30_000, 'login após logout portal');
  await pause(page, 700, 'tela de login');
  if (!page.url().includes('/login')) {
    await page.goto(`${kunkUrl}/login`, { waitUntil: 'domcontentloaded' });
  }
}

function serviceRow(page, associateName) {
  return page
    .locator('table tbody tr')
    .filter({ hasText: new RegExp(associateName, 'i') })
    .first();
}

async function contestIrisOnPortal(page, associateName) {
  const row = serviceRow(page, associateName);
  await waitVisible(row, 20_000, `linha ${associateName}`);
  await pause(page, 6_000, 'antes de clicar no atendimento Iris');
  await click(page, row, `abrir validação de ${associateName}`);

  await waitVisible(
    page.getByText(/Tudo certo com esse atendimento/i),
    15_000,
    'modal de validação'
  );
  await pause(page, 3_000, 'antes de Estão faltando dados');
  await click(
    page,
    page.getByRole('button', { name: /Estão faltando dados/i }),
    'Estão faltando dados'
  );

  const reason = page.getByLabel(/Descreva o que está faltando/i);
  await waitVisible(reason, 15_000, 'campo descrição');
  await click(page, reason, 'foco descrição');
  await typeOverDuration(
    reason,
    CONTEST_TEXT,
    Math.max(2200, CONTEST_TEXT.length * 35),
    'Descreva o que está faltando'
  );
  await click(page, page.getByRole('button', { name: /^Enviar$/i }), 'Enviar contestação');
  await page.getByText(/Tudo certo com esse atendimento/i).waitFor({
    state: 'hidden',
    timeout: 20_000,
  });
  await pause(page, 5_000, 'após enviar contestação');
}

async function approveKarenOnPortal(page, associateName) {
  const row = serviceRow(page, associateName);
  await waitVisible(row, 20_000, `linha ${associateName}`);
  await click(page, row, `abrir validação de ${associateName}`);
  await waitVisible(
    page.getByText(/Tudo certo com esse atendimento/i),
    15_000,
    'modal de validação Karen'
  );
  await click(page, page.getByRole('button', { name: /^Sim$/i }), 'Sim (validar Karen)');
  await page.getByText(/Tudo certo com esse atendimento/i).waitFor({
    state: 'hidden',
    timeout: 20_000,
  });
  await pause(page, 4_000, 'após Sim, antes de Sair');
}

async function goToServicesReportViaMenu(page) {
  await clickSidebarItem(page, 'Relatórios', 'Atendimentos');
  await waitUrl(page, /\/app\/relatorios\/servicos/, 30_000, 'relatório via menu');
  await waitVisible(
    page.getByText(/Agrupado por mês e profissional/i).first(),
    30_000,
    'relatório recarregado'
  );
}

async function editIrisConsultationPrice(page, associateName) {
  const row = serviceRow(page, associateName);
  await waitVisible(row, 20_000, `linha staff ${associateName}`);
  const openBtn = row.getByRole('button', { name: /Abrir atendimento/i });
  await waitVisible(openBtn, 15_000, 'Abrir atendimento');
  await pause(page, 3_000, 'antes de Abrir atendimento');
  await click(page, openBtn, 'Abrir atendimento Iris');

  await waitUrl(page, /\/app\/acolhimento\/servicos/, 30_000, 'página de atendimentos');
  await waitVisible(page.locator('table tbody tr').first(), 30_000, 'lista de atendimentos');

  const serviceRowOnPage = page
    .locator('table tbody tr')
    .filter({ hasText: new RegExp(associateName, 'i') })
    .first();
  await waitVisible(serviceRowOnPage, 30_000, 'Iris na lista de atendimentos');
  await click(
    page,
    serviceRowOnPage.getByTestId('service-info'),
    'Detalhes do atendimento Iris'
  );

  const dialog = page
    .getByRole('dialog')
    .filter({ hasText: /Detalhes do atendimento/i })
    .first();
  await waitVisible(dialog, 20_000, 'modal Detalhes do atendimento');

  const price = dialog.getByLabel('Valor da consulta');
  await waitVisible(price, 15_000, 'Valor da consulta');
  await click(page, price, 'foco Valor da consulta');
  await price.fill('100');
  await pause(page, 700, 'preço 100');
  await click(page, dialog.getByRole('button', { name: /^Salvar$/i }), 'Salvar atendimento');
  await dialog.waitFor({ state: 'hidden', timeout: 30_000 });
  await pause(page, 900, 'atendimento salvo');

  await goToServicesReportViaMenu(page);
}

async function resolveIrisContest(page, associateName) {
  const row = serviceRow(page, associateName);
  await waitVisible(row, 20_000, `linha contestada ${associateName}`);
  await row.scrollIntoViewIfNeeded();
  const contestBtn = row.getByRole('button', { name: /Ver contestação/i });
  await waitVisible(contestBtn, 20_000, 'ícone de contestação');
  await moveDemoCursorTo(contestBtn, { durationMs: 450, settleMs: 80 });
  await click(page, contestBtn, 'abrir contestação');

  const dialog = page.getByRole('dialog').filter({ hasText: /Contestação/i });
  await waitVisible(dialog, 15_000, 'modal Contestação');
  await pause(page, 900, 'mostrar contestação');
  await click(page, dialog.getByRole('button', { name: /^Resolver$/i }), 'Resolver');
  await dialog.waitFor({ state: 'hidden', timeout: 30_000 });
  await pause(page, 1000, 'contestação resolvida');
}

async function main() {
  const cfg = demoCommonEnv();
  const kunkUrl = kunkBaseUrl();
  const op = operatorCredentials();
  const pro = professionalCredentials();
  const outDir = demoKindOutDir('relatorio-servicos', cfg.outDir);
  const holdMs = Number(process.env.DEMO_HOLD_MS || 10_000);
  let demoData = null;

  log('start', '════════════ relatório de serviços / contestação ════════════');
  log('start', `kunk=${kunkUrl} | hold=${fmtSec(holdMs)} | outDir=${outDir}`);

  await ensureOperator();
  await ensureProfessional();

  const {
    prepareServicesReportDemo,
    cleanupServicesReportDemoContests,
  } = await import('../e2e/helpers/db.js');
  demoData = await prepareServicesReportDemo({
    professionalEmail: pro.email,
    contestText: CONTEST_TEXT,
  });
  log(
    'setup',
    `profissional=${demoData.professional.display_name} | mês=${demoData.monthLabel} | iris=#${demoData.service.id} | karen=#${demoData.secondService.id}`
  );
  log('setup', 'contestações/aprovações de Iris e Karen zeradas antes da gravação');

  const { page, closeAndSave } = await openDemoBrowser({
    mobile: cfg.mobile,
    channel: cfg.channel,
    slowMo: cfg.slowMo,
    outDir,
    label: 'relatorio-servicos',
  });

  try {
    // 1) Staff — visão geral + scroll + logout
    await loginOperator(page, kunkUrl, op.email, op.password, {
      landingPattern: /\/app\//,
    });
    await openStaffReport(page, kunkUrl);
    await pause(page, 1200, 'relatório staff');
    await scrollWindowFor(page, 10_000, 'down', 'staff topo ao fim');
    await scrollWindowFor(page, 5_000, 'up', 'staff fim ao topo');
    await logoutStaff(page, kunkUrl);

    // 2) Portal Marina — contesta Iris e valida Karen
    await loginOperator(page, kunkUrl, pro.email, pro.password, {
      landingPattern: /\/relatorio\/servicos/,
    });
    await waitVisible(
      page.locator('h1').filter({ hasText: /Relatório de atendimentos/i }),
      30_000,
      'portal relatório'
    );
    await contestIrisOnPortal(
      page,
      demoData.service.associate_name || demoData.service.patient_name
    );
    await approveKarenOnPortal(
      page,
      demoData.secondService.associate_name || demoData.secondService.patient_name
    );
    await logoutPortal(page, kunkUrl);

    // 3) Staff — corrige preço Iris e resolve contestação
    await loginOperator(page, kunkUrl, op.email, op.password, {
      landingPattern: /\/app\//,
    });
    await openStaffReport(page, kunkUrl);
    await editIrisConsultationPrice(
      page,
      demoData.service.associate_name || demoData.service.patient_name
    );
    await resolveIrisContest(
      page,
      demoData.service.associate_name || demoData.service.patient_name
    );

    log('finish', `hold final ${fmtSec(holdMs)}`);
    await pause(page, holdMs, 'hold final');
  } finally {
    log('browser', 'fechando e salvando vídeo…');
    try {
      await closeAndSave();
    } finally {
      if (demoData?.professional?.id) {
        const result = await cleanupServicesReportDemoContests({
          professionalId: demoData.professional.id,
          contestText: CONTEST_TEXT,
          serviceIds: [demoData.service.id, demoData.secondService.id],
          restoreIrisPrice: 200,
        });
        log('cleanup', `✓ contestações removidas=${result.removed}`);
      }
    }
  }
}

main().catch((err) => {
  console.error('\nFALHA:', err?.message || err);
  process.exit(1);
});
