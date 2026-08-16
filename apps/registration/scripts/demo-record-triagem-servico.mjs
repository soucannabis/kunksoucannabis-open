/**
 * Demo gravada: Triagem → Serviço → Pagamento Concluído → Info (scroll) → "Somente pagos".
 *
 * Continuação da demo de triagem: usa o 1º item da fila (Espera), encaminha
 * para Serviços, cria o serviço, marca Pagamento Concluído, abre o modal Info
 * (Detalhes do atendimento) com scroll, e filtra somente pagos.
 *
 * Este script roda deliberadamente mais lento (slowMo alto + pausas longas)
 * para leitibilidade no vídeo.
 *
 * Pré-requisitos:
 *   - API :4250, Kunk :4257, Edge
 *   - Associado no banco (seed @demo.kunk.local)
 *   - Profissionais colaboradores (seed)
 *
 * Uso:
 *   cd apps/registration && npm run demo:triagem-servico
 *
 * Env:
 *   DEMO_SLOW_MO  (default deste script: 900; outras demos usam 350)
 */
import {
  demoCommonEnv,
  demoKindOutDir,
  env,
  openDemoBrowser,
  pause,
} from './demo-lib.mjs';
import {
  ensureOperator,
  firstTriageRow,
  fmtSec,
  kunkBaseUrl,
  log,
  loginOperator,
  openActionFromFirstRow,
  openTriageEspera,
  operatorCredentials,
  resolveDemoAssociate,
  seedLinkedReception,
  waitUrl,
  waitVisible,
} from './demo-triagem-shared.mjs';

/** Pausa alongada (este vídeo é mais lento que as outras demos). */
async function beat(page, ms, reason = '') {
  await pause(page, ms, reason);
}

async function createServiceFromModal(page) {
  log('step', 'serviços — criar via modal Novo Serviço');
  await waitUrl(page, /\/app\/acolhimento\/servicos/, 45_000, 'serviços');
  await waitVisible(
    page.getByRole('heading', { name: /Novo Serviço/i }),
    30_000,
    'dialog Novo Serviço'
  );
  await beat(page, 2800, 'modal aberto com associado');

  const proField = page.getByLabel('Profissionais (colaboradores)');
  await waitVisible(proField, 20_000, 'Profissionais (colaboradores)');
  log('click', 'abrir autocomplete profissionais');
  await beat(page, 900, 'antes de abrir profissionais');
  await proField.click();
  await beat(page, 1800, 'lista profissionais');

  const option = page.getByRole('option').first();
  await waitVisible(option, 20_000, '1ª opção de profissional');
  const optionText = (await option.innerText().catch(() => '')).trim();
  log('click', `profissional = ${optionText || '(1º option)'}`);
  await beat(page, 800, 'antes de escolher profissional');
  await option.click();
  await beat(page, 2000, 'profissional selecionado');

  await page.keyboard.press('Escape').catch(() => null);
  await beat(page, 1200, 'após fechar lista');

  const createBtn = page.getByRole('button', { name: /^Criar$/i });
  await waitVisible(createBtn, 15_000, 'button Criar');
  await beat(page, 1200, 'antes de Criar');
  log('click', 'Criar serviço');
  await createBtn.click();

  await page
    .getByRole('heading', { name: /Novo Serviço/i })
    .waitFor({ state: 'hidden', timeout: 45_000 });
  log('wait-el', '✓ dialog Novo Serviço fechado');
  await beat(page, 2800, 'lista serviços após criar');
  log('services', 'serviço criado ✓');
}

function serviceInfoDialog(page) {
  return page
    .getByRole('dialog')
    .filter({ hasText: /Detalhes do atendimento/i })
    .first();
}

/**
 * O botão Info é um IconButton sem texto; tenta testid, aria-label do Tooltip
 * e, por último, posição na célula de Ações (Info fica antes de Excluir).
 */
async function openServiceInfoModal(page, row) {
  const actionsCell = row.locator('td').last();
  const candidates = [
    ['data-testid', row.locator('[data-testid="service-info"]').first()],
    ['aria-label Info', row.getByRole('button', { name: /^Info$/i }).first()],
    ['svg InfoIcon', actionsCell.locator('button:has([data-testid="InfoIcon"])').first()],
    ['penúltimo botão de Ações', actionsCell.locator('button').nth(-2)],
  ];

  for (const [how, locator] of candidates) {
    const count = await locator.count().catch(() => 0);
    if (!count) {
      log('click', `botão Info via ${how} → não encontrado`);
      continue;
    }
    if (!(await locator.isVisible().catch(() => false))) {
      log('click', `botão Info via ${how} → invisível`);
      continue;
    }
    log('click', `abrir Info (via ${how})`);
    await beat(page, 900, 'antes de abrir Info');
    await locator.scrollIntoViewIfNeeded().catch(() => null);
    await locator.click();
    const opened = await serviceInfoDialog(page)
      .waitFor({ state: 'visible', timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (opened) return;
    log('click', `modal não abriu via ${how}; tentando próxima estratégia`);
  }

  const debug = await actionsCell.innerHTML().catch(() => '(sem HTML)');
  throw new Error(`Não achei o botão Info na linha do serviço. Ações HTML:\n${debug}`);
}

async function scrollServiceInfoModal(page) {
  const dialog = serviceInfoDialog(page);
  await waitVisible(dialog, 15_000, 'modal Detalhes do atendimento');
  await beat(page, 1800, 'modal Info aberto');

  const content = dialog.locator('.MuiDialogContent-root').first();
  await content.waitFor({ state: 'visible', timeout: 10_000 });

  log('step', 'scroll no modal de detalhes do serviço');
  await content.evaluate(async (el) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const max = Math.max(0, el.scrollHeight - el.clientHeight);
    if (max < 8) {
      await sleep(800);
      return;
    }
    const step = Math.max(48, Math.round(el.clientHeight * 0.35));
    for (let y = 0; y < max; y += step) {
      el.scrollTo({ top: Math.min(y, max), behavior: 'smooth' });
      await sleep(420);
    }
    el.scrollTo({ top: max, behavior: 'smooth' });
    await sleep(900);
    el.scrollTo({ top: 0, behavior: 'smooth' });
    await sleep(600);
  });
}

async function markServicePaidAndFilter(page) {
  log('step', 'serviços — Pagamento Concluído → Info → Somente pagos');

  const firstRow = page.locator('table tbody tr').first();
  await waitVisible(firstRow, 30_000, '1ª linha de serviço');
  await beat(page, 2200, 'mostrar serviço criado');

  const statusCell = firstRow.locator('td').nth(8);
  await waitVisible(
    statusCell.getByText(/Aguardando Pagamento/i).first(),
    20_000,
    'status Aguardando Pagamento'
  );
  await beat(page, 1500, 'antes de alternar status');

  log('click', 'toggle status → Pagamento Concluído');
  await statusCell.locator('button').first().click();
  await beat(page, 2500, 'após toggle status');

  await waitVisible(
    statusCell.getByText(/Pagamento Concluído/i).first(),
    20_000,
    'status Pagamento Concluído'
  );
  log('services', 'status = Pagamento Concluído ✓');
  await beat(page, 1800, 'mostrar Pagamento Concluído');

  log('step', 'abrir detalhes do serviço (Info)');
  await openServiceInfoModal(page, firstRow);
  await scrollServiceInfoModal(page);

  log('click', 'fechar modal Info (Cancelar)');
  await serviceInfoDialog(page).getByRole('button', { name: /Cancelar/i }).click();
  await serviceInfoDialog(page)
    .waitFor({ state: 'hidden', timeout: 15_000 })
    .catch(() => null);
  await beat(page, 1200, 'após fechar modal Info');

  const atualizar = page.getByRole('button', { name: /^Atualizar$/i });
  await waitVisible(atualizar, 15_000, 'button Atualizar');
  const filterRow = atualizar.locator('xpath=ancestor::div[1]');
  const pagoBtn = filterRow.locator('button').first();
  await beat(page, 1200, 'antes do filtro Somente pagos');
  log('click', 'filtro Somente pagos');
  await pagoBtn.click();
  await beat(page, 2800, 'após filtrar somente pagos');

  await waitVisible(
    page.locator('table tbody tr').first(),
    20_000,
    'serviço no filtro Somente pagos'
  );
  await waitVisible(
    page
      .locator('table tbody tr')
      .first()
      .getByText(/Pagamento Concluído/i)
      .first(),
    15_000,
    'linha com Pagamento Concluído'
  );
  log('finish', 'serviço pago visível no filtro ✓');
}

async function main() {
  const cfg = demoCommonEnv();
  const format = cfg.mobile ? 'mobile' : 'desktop';
  const outDir = demoKindOutDir('triagem-servico', cfg.outDir);
  const kunkUrl = kunkBaseUrl();
  const op = operatorCredentials();
  // Default mais lento que as outras demos (350); DEMO_SLOW_MO ainda sobrescreve.
  const slowMo = Number(env('DEMO_SLOW_MO', '900'));

  log('start', '══════════════════════════════════════');
  log(
    'start',
    `demo=triagem-servico | format=${format} | slowMo=${slowMo}ms (lento) | hold=${fmtSec(cfg.holdMs)}`
  );
  log('start', `kunk=${kunkUrl}`);
  log('start', `operador=${op.email}`);
  log('start', `outDir=${outDir}`);
  log('start', '══════════════════════════════════════');

  await ensureOperator();
  const associate = await resolveDemoAssociate();
  log(
    'setup',
    `associado=${associate.name} ${associate.last_name} <${associate.email}>`
  );

  const { context, page, closeAndSave } = await openDemoBrowser({
    mobile: cfg.mobile,
    channel: cfg.channel,
    slowMo,
    outDir,
    label: 'triagem-servico',
  });

  try {
    await seedLinkedReception(context.request, kunkUrl, associate, 'servico');

    await loginOperator(page, kunkUrl, op.email, op.password);
    await beat(page, 2200, 'após login');

    log('step', '1/3 triagem → Atendimento');
    await openTriageEspera(page, kunkUrl);
    await beat(page, 1800, 'triagem estabilizada');
    await firstTriageRow(page, associate.name);
    await beat(page, 2500, 'mostrar 1ª linha');
    await openActionFromFirstRow(page, 'Atendimento');
    await beat(page, 1500, 'após encaminhar para Atendimento');

    log('step', '2/3 criar serviço');
    await createServiceFromModal(page);

    log('step', '3/3 pagar → Info → filtrar');
    await markServicePaidAndFilter(page);
    await beat(page, Math.max(cfg.holdMs, 15_000), 'hold final serviços pagos');
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
