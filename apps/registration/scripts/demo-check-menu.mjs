/**
 * Verificação isolada da navegação pelo menu lateral (sem o roteiro completo).
 *
 * Faz login como Acolhimento e navega Relatórios → Atendimentos algumas vezes,
 * partindo de páginas diferentes, para garantir que o clique não é interceptado
 * pelo cabeçalho da seção.
 *
 * Uso: npm run demo:check-menu
 */
import {
  demoCommonEnv,
  demoKindOutDir,
  fmtSec,
  log,
  openDemoBrowser,
  pause,
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

async function goToReport(page, attempt) {
  log('check', `tentativa ${attempt}: Relatórios → Atendimentos`);
  await clickSidebarItem(page, 'Relatórios', 'Atendimentos');
  await waitUrl(page, /\/app\/relatorios\/servicos/, 30_000, `relatório (tentativa ${attempt})`);
  await waitVisible(
    page.locator('h1').filter({ hasText: /Relatório de atendimentos/i }),
    30_000,
    `título relatório (tentativa ${attempt})`
  );
  log('check', `✓ tentativa ${attempt} OK`);
}

async function main() {
  const cfg = demoCommonEnv();
  const kunkUrl = kunkBaseUrl();
  const op = operatorCredentials();
  const outDir = demoKindOutDir('check-menu', cfg.outDir);

  log('start', '════════════ verificação do menu lateral ════════════');
  log('start', `kunk=${kunkUrl} | outDir=${outDir}`);

  await ensureOperator();

  const { page, closeAndSave } = await openDemoBrowser({
    mobile: cfg.mobile,
    channel: cfg.channel,
    slowMo: cfg.slowMo,
    outDir,
    label: 'check-menu',
  });

  try {
    await loginOperator(page, kunkUrl, op.email, op.password, { landingPattern: /\/app\// });

    // 1) direto da landing (triagem), com a seção Relatórios fechada
    await goToReport(page, 1);
    await pause(page, 800, 'relatório aberto');

    // 2) a partir da própria página de relatório, seção já aberta
    await goToReport(page, 2);
    await pause(page, 800, 'relatório reaberto');

    // 3) a partir da lista de atendimentos, como acontece na demo real
    log('goto', `${kunkUrl}/app/acolhimento/servicos`);
    await page.goto(`${kunkUrl}/app/acolhimento/servicos`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await waitUrl(page, /\/app\/acolhimento\/servicos/, 30_000, 'lista de atendimentos');
    await pause(page, 800, 'lista carregada');
    await goToReport(page, 3);

    log('finish', 'menu validado nas 3 tentativas');
    await pause(page, 1500, 'hold final');
  } finally {
    log('browser', 'fechando e salvando vídeo…');
    await closeAndSave();
  }
}

main().catch((err) => {
  console.error(`\nFALHA: ${err?.message || err}`);
  process.exit(1);
});
