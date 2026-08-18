/**
 * Demo gravada: página de Triagem (/app/acolhimento/triagem).
 *
 * Pré-flight: apaga receptions Concluído (`done`) e cria novos, incluindo
 * Ana Silva (não o mais recente) para busca + linkagem ao associado Ana Silva.
 *
 * Fluxo:
 * 1. Abre a página → scroll até embaixo e volta
 * 2. Status → mostra opções → seleciona Concluído
 * 3. Busca por "Ana Silva"
 * 4. Hover 3s no avatar de atendente
 * 5. Assumir o contato → aguarda 4s
 * 6. Transferir contato → outro atendente → aguarda 10s
 * 7. Ações → Linkar a um Associado → aguarda 5s → pesquisa Ana Silva e linka
 * 8. Ações de novo → mostra as opções (sem clicar) → hold 10s e encerra
 *
 * Uso:
 *   npm run demo:acolhimento-triagem
 */
import {
  clickWithCursor,
  demoCommonEnv,
  demoKindOutDir,
  fmtSec,
  log,
  moveDemoCursorTo,
  openDemoBrowser,
  pause,
  scrollPageToBottom,
  scrollPageToTop,
  typeOverDuration,
} from './demo-lib.mjs';
import {
  ensureOperator,
  kunkBaseUrl,
  loginOperator,
  operatorCredentials,
  waitUrl,
  waitVisible,
} from './demo-triagem-shared.mjs';

async function click(page, locator, label) {
  log('click', label);
  await clickWithCursor(locator);
  log('click', `✓ ${label}`);
}

async function ensureAdmin() {
  try {
    const { ensureAdminUser } = await import('../../kunk/e2e/helpers/db.js');
    log('setup', 'garantindo usuário Admin no banco…');
    await ensureAdminUser();
    log('setup', 'usuário Admin OK');
  } catch (err) {
    log('warn', `ensureAdminUser falhou (${err?.message || err}) — seguindo se já existir`);
  }
}

async function openTriagePage(page, kunkUrl) {
  const url = `${kunkUrl}/app/acolhimento/triagem`;
  log('goto', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await waitUrl(page, /\/app\/acolhimento\/triagem/, 30_000, 'triagem');
  await waitVisible(page.getByLabel('Status'), 30_000, 'filtro Status');
  await pause(page, 1000, 'página aberta');
  await scrollPageToBottom(page, {
    pauseMs: 1200,
    label: 'triagem — antes do Status',
  });
  await scrollPageToTop(page, {
    pauseMs: 1000,
    label: 'triagem — volta ao topo',
  });
}

async function filterStatusConcluido(page) {
  const status = page.getByLabel('Status');
  await waitVisible(status, 20_000, 'input Status');
  await click(page, status, 'abrir Status');
  await pause(page, 1800, 'mostrar opções de status');

  const option = page.getByRole('option', { name: /Concluído/i }).first();
  await waitVisible(option, 15_000, 'opção Concluído');
  await click(page, option, 'selecionar Concluído');
  await pause(page, 1200, 'lista Concluído');
}

async function searchConcludedContact(page, searchName) {
  const search = page.getByPlaceholder(/Nome, e-mail ou telefone/i);
  await waitVisible(search, 15_000, 'campo busca');
  await click(page, search, 'foco busca');
  await typeOverDuration(search, searchName, Math.max(1600, searchName.length * 70), 'busca');
  await pause(page, 900, 'após digitar busca');

  const buscar = page.getByRole('button', { name: /^Buscar$/i });
  if (await buscar.isVisible().catch(() => false)) {
    await click(page, buscar, 'Buscar');
  } else {
    await search.press('Enter');
  }

  const row = page
    .locator('table tbody tr')
    .filter({ hasText: new RegExp(searchName, 'i') })
    .first();
  await waitVisible(row, 20_000, `contato ${searchName}`);
  await pause(page, 800, 'resultado da busca');
  return row;
}

async function hoverAttendantAvatar(page) {
  const avatar = page.locator('.MuiAvatarGroup-root .MuiAvatar-root').first();
  await waitVisible(avatar, 20_000, 'avatar de atendente');
  log('hover', 'avatar de atendente (3s)');
  await moveDemoCursorTo(avatar, { durationMs: 500, settleMs: 80 });
  await pause(page, 3_000, 'hover avatar atendente');
}

async function assumeContact(page, row) {
  const btn = row.getByRole('button', { name: /Assumir o contato/i });
  await waitVisible(btn, 15_000, 'Assumir o contato');
  await click(page, btn, 'Assumir o contato');
  await pause(page, 4_000, 'após Assumir o contato');
}

async function transferContact(page, row, attendantLabel) {
  const btn = row.getByRole('button', { name: /Transferir contato/i });
  await waitVisible(btn, 15_000, 'Transferir contato');
  await click(page, btn, 'Transferir contato');

  const option = page.getByRole('menuitem').filter({ hasText: new RegExp(attendantLabel, 'i') }).first();
  await waitVisible(option, 15_000, `atendente ${attendantLabel}`);
  await click(page, option, `transferir → ${attendantLabel}`);
  await pause(page, 10_000, 'após transferir — antes das Ações');
}

async function showActionsMenu(page, row) {
  const actions = row.getByRole('button', { name: /Ações de pedido e atendimento/i });
  await waitVisible(actions, 15_000, 'Ações (mostrar menu)');
  await click(page, actions, 'Ações (mostrar opções)');
  await waitVisible(
    page.getByRole('menuitem').first(),
    10_000,
    'menu Ações aberto'
  );
  await pause(page, 900, 'mostrar opções do Ações');
}

async function linkAssociate(page, row, associateSearch) {
  const actions = row.getByRole('button', { name: /Ações de pedido e atendimento/i });
  await waitVisible(actions, 15_000, 'Ações');
  await click(page, actions, 'Ações');

  const linkItem = page.getByRole('menuitem', { name: /Linkar a um Associado/i });
  await waitVisible(linkItem, 15_000, 'Linkar a um Associado');
  await click(page, linkItem, 'Linkar a um Associado');

  const title = page.getByText('Linkar associado', { exact: true });
  await waitVisible(title, 15_000, 'modal Linkar associado');
  await pause(page, 5_000, 'modal aberto — antes de preencher nome');

  const search = page.getByLabel(/Buscar por nome, e-mail, CPF/i);
  await waitVisible(search, 15_000, 'busca associado');
  await click(page, search, 'foco busca associado');
  await typeOverDuration(
    search,
    associateSearch,
    Math.max(1600, String(associateSearch).length * 70),
    'busca associado'
  );
  await pause(page, 1200, 'resultados da busca');

  const result = page
    .locator('button')
    .filter({ hasText: new RegExp(associateSearch, 'i') })
    .first();
  await waitVisible(result, 20_000, 'resultado associado');
  await click(page, result, 'linkar associado');
  await title.waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => null);
  await pause(page, 1200, 'associado linkado');
}

async function main() {
  const cfg = demoCommonEnv();
  const kunkUrl = kunkBaseUrl();
  const op = operatorCredentials();
  const outDir = demoKindOutDir('acolhimento-triagem', cfg.outDir);
  const holdMs = Number(process.env.DEMO_HOLD_MS || 10_000);

  log('start', '════════════ acolhimento / triagem ════════════');
  log('start', `kunk=${kunkUrl} | hold=${fmtSec(holdMs)} | outDir=${outDir}`);

  await ensureOperator();
  await ensureAdmin();

  const { prepareTriageConcluidoDemo } = await import('../e2e/helpers/db.js');
  const demoData = await prepareTriageConcluidoDemo({
    attendantCode: 'ADMIN-TEST',
  });
  log(
    'setup',
    `concluídos removidos=${demoData.deleted} | criados=${demoData.contacts.length} | busca="${demoData.searchName}" | link="${demoData.associate.search}" | ana=#${demoData.primary.id} | transferir=${demoData.transferAttendantName}`
  );

  const { page, closeAndSave } = await openDemoBrowser({
    mobile: cfg.mobile,
    channel: cfg.channel,
    slowMo: cfg.slowMo,
    outDir,
    label: 'acolhimento-triagem',
  });

  try {
    await loginOperator(page, kunkUrl, op.email, op.password, { landingPattern: /\/app\// });
    // Limpa cache da API para refletir os nomes fictícios dos atendentes.
    await page.request.post(`${kunkUrl}/api/v1/cache/clear`, { data: {} }).catch(() => null);
    await openTriagePage(page, kunkUrl);
    await filterStatusConcluido(page);
    const row = await searchConcludedContact(page, 'Ana Silva');
    await hoverAttendantAvatar(page);
    await assumeContact(page, row);
    await transferContact(page, row, demoData.transferAttendantName || 'Carlos Mendes');
    await linkAssociate(page, row, 'Ana Silva');
    // Após linkar, o menu Ações passa a mostrar Pedido / Atendimento / Desvincular.
    await showActionsMenu(page, row);
    log('finish', `hold final ${fmtSec(holdMs)}`);
    await pause(page, holdMs, 'hold final com Ações aberto');
  } finally {
    log('browser', 'fechando e salvando vídeo…');
    await closeAndSave();
  }
}

main().catch((err) => {
  console.error(`\nFALHA: ${err?.message || err}`);
  process.exit(1);
});
