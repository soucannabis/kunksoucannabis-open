/**
 * Demo gravada: triagem → Atendimento → pagamento Pix com comprovante.
 *
 * Fluxo:
 * 1. Cria reception via API para Ana Silva (associado@soucannabis.ong.br).
 * 2. Login Acolhimento, abre a triagem e encaminha para Atendimento.
 * 3. Preenche profissional Lucas Nogueira, doação 100, data 04/07/2026,
 *    tag retorno e observação; cria o atendimento.
 * 4. Abre Detalhes do atendimento, escolhe Pix, envia comprovante/pago.
 * 5. Hover no ícone Google Calendar (sem clicar), aguarda 15s e encerra.
 * 6. Limpa reception, serviços e comprovantes do associado.
 *
 * Uso:
 *   DEMO_ASSOCIATE_EMAIL=associado@soucannabis.ong.br \
 *   npm run demo:atendimento-servicos
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  clickWithCursor,
  demoCommonEnv,
  demoKindOutDir,
  fmtSec,
  log,
  moveDemoCursorTo,
  openDemoBrowser,
  pause,
  typeOverDuration,
} from './demo-lib.mjs';
import {
  ensureOperator,
  firstTriageRow,
  kunkBaseUrl,
  loginOperator,
  openTriageEspera,
  operatorCredentials,
  resolveDemoAssociate,
  seedLinkedReception,
  waitUrl,
  waitVisible,
} from './demo-triagem-shared.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RECEIPT_FIXTURE = join(__dirname, '..', 'demos', 'fixtures', 'doc.jpg');
const PROFESSIONAL_NAME = /Lucas\s+Nogueira/i;
const CONSULTATION_DATE = '2026-07-04T10:00';
const OBSERVATION = 'Olá Dr Lucas, essa é uma consulta de retorno.';

async function click(page, locator, label) {
  log('click', label);
  await clickWithCursor(locator);
  log('click', `✓ ${label}`);
}

async function cleanupDemoData(email) {
  const { cleanupAssociateServicesAndReception } = await import('../e2e/helpers/db.js');
  log('cleanup', `removendo reception/serviços de ${email}`);
  const result = await cleanupAssociateServicesAndReception(email);
  log(
    'cleanup',
    `✓ serviços=${result.deletedServices} | comprovantes=${result.deletedReceiptFiles} | reception=${result.deletedReception}`
  );
  return result;
}

async function openAtendimentoFromTriage(page, associate) {
  log('step', 'triagem → Atendimento');
  await firstTriageRow(page, associate.name);
  await pause(page, 900, 'mostrar triagem recém-criada');

  const row = page
    .locator('table tbody tr')
    .filter({ hasText: new RegExp(associate.name, 'i') })
    .first();
  await waitVisible(row, 20_000, 'linha da reception');
  const actions = row.getByRole('button', { name: 'Ações de pedido e atendimento' });
  await click(page, actions, 'Opções de pedido e atendimento');
  await waitVisible(page.getByRole('menuitem', { name: 'Atendimento' }), 10_000, 'opção Atendimento');
  await pause(page, 1200, 'opções abertas');
  await click(page, page.getByRole('menuitem', { name: 'Atendimento' }), 'opção Atendimento');
}

async function createServiceFromModal(page) {
  log('step', 'novo atendimento — profissional, doação, data, tag e observação');
  await waitUrl(page, /\/app\/acolhimento\/servicos/, 45_000, 'serviços');

  const dialog = page.getByRole('dialog').filter({ hasText: /Novo Atendimento|Novo Serviço/i });
  await waitVisible(dialog, 30_000, 'modal Novo Atendimento');
  await pause(page, 1000, 'modal aberto');

  const proField = dialog.getByLabel('Profissionais (colaboradores)');
  await waitVisible(proField, 20_000, 'Profissionais');
  await click(page, proField, 'abrir profissionais');
  const listbox = page.getByRole('listbox');
  await waitVisible(listbox, 15_000, 'lista de profissionais');
  await pause(page, 1600, 'mostrar todos os profissionais');
  const lucas = listbox.getByRole('option').filter({ hasText: PROFESSIONAL_NAME }).first();
  await waitVisible(lucas, 15_000, 'Lucas Nogueira');
  await click(page, lucas, 'selecionar Lucas Nogueira');
  await page.keyboard.press('Escape').catch(() => null);
  await pause(page, 800, 'profissional selecionado');

  const donation = dialog.getByLabel('Doação');
  await waitVisible(donation, 15_000, 'Doação');
  await click(page, donation, 'foco Doação');
  await donation.fill('');
  await typeOverDuration(donation, '100', 700, 'Doação');

  const dateField = dialog.getByLabel('Data da consulta');
  await waitVisible(dateField, 15_000, 'Data da consulta');
  await click(page, dateField, 'foco Data da consulta');
  await dateField.fill(CONSULTATION_DATE);
  await pause(page, 700, 'data 04/07/2026');

  const tagsField = dialog.getByLabel('Tags');
  await click(page, tagsField, 'abrir Tags');
  const tagsList = page.getByRole('listbox');
  await waitVisible(tagsList, 15_000, 'lista de tags');
  await pause(page, 1400, 'mostrar todas as tags');
  const retorno = tagsList.getByRole('option', { name: /^retorno$/i }).first();
  await waitVisible(retorno, 10_000, 'tag retorno');
  await click(page, retorno, 'selecionar tag retorno');
  await page.keyboard.press('Escape').catch(() => null);
  await pause(page, 600, 'tag selecionada');

  const observations = dialog.getByLabel('Observações');
  await click(page, observations, 'foco Observações');
  await typeOverDuration(
    observations,
    OBSERVATION,
    Math.max(1800, OBSERVATION.length * 45),
    'Observações'
  );

  const createBtn = dialog.getByRole('button', { name: /^Criar$/i });
  await click(page, createBtn, 'Criar atendimento');
  await dialog.waitFor({ state: 'hidden', timeout: 45_000 });
  log('services', 'atendimento criado ✓');
  await pause(page, 1200, 'lista de serviços');
}

function serviceInfoDialog(page) {
  return page
    .getByRole('dialog')
    .filter({ hasText: /Detalhes do atendimento/i })
    .first();
}

async function openServiceInfoModal(page, row) {
  const infoBtn = row.getByTestId('service-info');
  await waitVisible(infoBtn, 20_000, 'Detalhes do atendimento');
  await click(page, infoBtn, 'Detalhes do atendimento');
  await waitVisible(serviceInfoDialog(page), 20_000, 'modal Detalhes do atendimento');
}

async function generateServicePaymentLink(page, row) {
  log('step', 'atendimento — gerar link de pagamento Pagar.me');
  const payButton = row.getByTestId(/^service-pay-/);
  await waitVisible(payButton, 30_000, 'Pagamento Pagar.me');
  await click(page, payButton, 'Pagamento Pagar.me');

  const modal = page.getByTestId('payment-modal');
  await waitVisible(modal, 20_000, 'modal Pagamento Pagar.me');
  await pause(page, 900, 'modal de pagamento');
  await click(page, modal.getByTestId('generate-payment-link'), 'Gerar novo link de pagamento');
  await waitVisible(modal.getByTestId('payment-link'), 45_000, 'link de pagamento gerado');
  await pause(page, 900, 'link de pagamento Pagar.me');
  await click(page, modal.getByRole('button', { name: 'Fechar', exact: true }), 'Fechar pagamento Pagar.me');
  await modal.waitFor({ state: 'hidden', timeout: 20_000 });
}

async function scrollServiceInfoModal(page) {
  const dialog = serviceInfoDialog(page);
  const content = dialog.locator('.MuiDialogContent-root').first();
  await content.waitFor({ state: 'visible', timeout: 10_000 });
  log('step', 'scroll até o final do modal');
  await content.evaluate(async (el) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const max = Math.max(0, el.scrollHeight - el.clientHeight);
    if (max < 8) {
      await sleep(600);
      return;
    }
    const step = Math.max(48, Math.round(el.clientHeight * 0.4));
    for (let y = 0; y < max; y += step) {
      el.scrollTo({ top: Math.min(y, max), behavior: 'smooth' });
      await sleep(380);
    }
    el.scrollTo({ top: max, behavior: 'smooth' });
    await sleep(700);
  });
}

async function choosePixAndSendReceipt(page) {
  const dialog = serviceInfoDialog(page);
  log('step', 'tipo de pagamento Pix + comprovante');

  const payment = dialog.getByLabel('Tipo de pagamento');
  await waitVisible(payment, 15_000, 'Tipo de pagamento');
  await click(page, payment, 'abrir Tipo de pagamento');
  const listbox = page.getByRole('listbox');
  await waitVisible(listbox, 10_000, 'opções de pagamento');
  await pause(page, 1600, 'mostrar todas as opções de pagamento');
  await click(page, listbox.getByRole('option', { name: /^Pix$/i }), 'selecionar Pix');
  await pause(page, 700, 'Pix selecionado');

  const fileInput = dialog.locator('input[type="file"]');
  await fileInput.setInputFiles(RECEIPT_FIXTURE);
  await pause(page, 900, 'comprovante selecionado');
  await click(page, dialog.getByRole('button', { name: /Enviar\/Pago/i }), 'Enviar/Pago');
  await pause(page, 1800, 'após marcar pago');

  // Persiste o Pix e fecha o modal.
  const saveBtn = dialog.getByRole('button', { name: /^Salvar$/i });
  if (await saveBtn.isVisible().catch(() => false)) {
    await click(page, saveBtn, 'Salvar detalhes');
    await dialog.waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => null);
  } else {
    await click(page, dialog.getByRole('button', { name: /Cancelar/i }), 'Fechar modal');
    await dialog.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => null);
  }
  await pause(page, 900, 'voltar à lista');
}

async function hoverGoogleCalendar(page, row) {
  log('step', 'hover no ícone Google Calendar (sem clicar)');
  const calendarBtn = row
    .getByTestId('service-event-schedule')
    .or(row.getByTestId('service-event-open'))
    .first();
  await waitVisible(calendarBtn, 20_000, 'ícone Google Calendar');
  await calendarBtn.scrollIntoViewIfNeeded();
  await moveDemoCursorTo(calendarBtn, { durationMs: 450, settleMs: 80 });
  await pause(page, 1500, 'cursor sobre Google Calendar');
}

async function main() {
  const cfg = demoCommonEnv();
  const kunkUrl = kunkBaseUrl();
  const op = operatorCredentials();
  const outDir = demoKindOutDir('atendimento-servicos', cfg.outDir);
  const holdMs = Number(process.env.DEMO_HOLD_MS || 15_000);

  log('start', '════════════ triagem → atendimento / serviços ════════════');
  log('start', `kunk=${kunkUrl} | hold=${fmtSec(holdMs)} | outDir=${outDir}`);

  await ensureOperator();
  const associate = await resolveDemoAssociate();
  // Garante os dados de Ana Silva usados nas demos anteriores.
  associate.name = associate.name || 'Ana';
  associate.last_name = associate.last_name || 'Silva';
  log('setup', `associado=${associate.name} ${associate.last_name} <${associate.email}>`);
  await cleanupDemoData(associate.email);

  const { context, page, closeAndSave } = await openDemoBrowser({
    mobile: cfg.mobile,
    channel: cfg.channel,
    slowMo: cfg.slowMo,
    outDir,
    label: 'atendimento-servicos',
  });

  try {
    await seedLinkedReception(context.request, kunkUrl, associate, 'atendimento', {
      name: 'Ana',
      last_name: 'Silva',
      phone: '11999999999',
      help_topic: 'Agendamento / consulta',
      message: 'Gostaria de agendar uma consulta de retorno.',
    });

    await loginOperator(page, kunkUrl, op.email, op.password);
    await openTriageEspera(page, kunkUrl);
    await openAtendimentoFromTriage(page, associate);
    await createServiceFromModal(page);

    const serviceRow = page
      .locator('table tbody tr')
      .filter({ hasText: /Ana|Lucas\s+Nogueira/i })
      .first();
    await waitVisible(serviceRow, 30_000, 'linha do atendimento criado');
    await pause(page, 900, 'mostrar atendimento na lista');

    await generateServicePaymentLink(page, serviceRow);
    await openServiceInfoModal(page, serviceRow);
    await scrollServiceInfoModal(page);
    await choosePixAndSendReceipt(page);

    const paidRow = page
      .locator('table tbody tr')
      .filter({ hasText: /Ana|Lucas\s+Nogueira/i })
      .first();
    await waitVisible(paidRow, 20_000, 'linha após pagamento');
    await hoverGoogleCalendar(page, paidRow);

    log('finish', `hold final ${fmtSec(holdMs)}`);
    await pause(page, holdMs, 'hold final');
  } finally {
    log('browser', 'fechando e salvando vídeo…');
    try {
      await closeAndSave();
    } finally {
      await cleanupDemoData(associate.email);
    }
  }
}

main().catch((err) => {
  console.error('\nFALHA:', err?.message || err);
  process.exit(1);
});
