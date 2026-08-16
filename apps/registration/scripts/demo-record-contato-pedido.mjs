/**
 * Demo gravada: contato público → triagem → Pedido com frete Loggi.
 *
 * Fluxo:
 * 1. Preenche /contato com os dados do associado existente.
 * 2. Login Acolhimento, abre a triagem recém-criada e encaminha para Pedido.
 * 3. Atualiza data/arquivo da prescrição, adiciona o primeiro produto,
 *    calcula frete, seleciona Loggi e cria o pedido.
 * 4. Grava tracking_code via API, abre Detalhes do rastreio e do pedido.
 * 5. Marca pagamento concluído, filtra por esse status.
 * 6. Seleciona o pedido criado + #45/#44/#43 e gera o relatório de produção (PDF).
 *
 * Uso:
 *   DEMO_ASSOCIATE_EMAIL=associado@soucannabis.ong.br \
 *   npm run demo:contato-pedido
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
  scrollDownABit,
  scrollPageToTop,
  selectOptionWithCursor,
  typeOverDuration,
} from './demo-lib.mjs';
import {
  ensureOperator,
  fmtValue,
  kunkBaseUrl,
  loginOperator,
  operatorCredentials,
  resolveDemoAssociate,
  waitUrl,
  waitVisible,
} from './demo-triagem-shared.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRESCRIPTION_FIXTURE = join(
  __dirname,
  '..',
  'demos',
  'fixtures',
  'receita.jpg'
);
const TRACKING_CODE = 'KRAWGNCH';

async function click(page, locator, label) {
  log('click', label);
  await clickWithCursor(locator);
  log('click', `✓ ${label}`);
}

async function fillPublicContactForm(page, associate) {
  log('step', 'contato público — preencher formulário');
  await page.goto(`${kunkBaseUrl()}/contato`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await waitVisible(page.locator('.fila-card form'), 30_000, 'formulário de contato');
  await pause(page, 1000, 'formulário de contato');

  const values = {
    name: associate.name,
    last_name: associate.last_name,
    email: associate.email,
    phone: associate.phone,
    help_topic: 'Preciso de óleo / produto',
    message: 'Gostaria de fazer o pedido do meu óleo de cannabis.',
    is_associate: true,
  };
  const fields = await page.locator('.fila-card form [id^="fila-"]').evaluateAll(
    (elements) =>
      elements.map((element) => ({
        id: element.id.replace(/^fila-/, ''),
        tag: element.tagName.toLowerCase(),
        type: element.getAttribute('type') || '',
      }))
  );

  for (const field of fields) {
    const locator = page.locator(`#fila-${field.id}`);
    const value = values[field.id];
    if (field.type === 'checkbox') {
      if (value) await click(page, locator, `marcar ${field.id}`);
      continue;
    }
    if (field.tag === 'select') {
      const option = await locator.locator('option:not([value=""])').first();
      const optionValue = await option.getAttribute('value');
      await selectOptionWithCursor(
        locator,
        field.id === 'help_topic' && value ? { label: value } : optionValue,
        {
          openHoldMs: field.id === 'help_topic' ? 1400 : 750,
          label: field.id === 'help_topic' ? 'Como podemos ajudar?' : field.id,
        }
      );
      continue;
    }
    const text = value || `Demo ${field.id}`;
    await typeOverDuration(locator, text, Math.max(550, String(text).length * 55), field.id);
  }

  await scrollDownABit(page, { ratio: 0.35, pauseMs: 700, label: 'até enviar contato' });
  const submit = page.locator('.fila-card form button[type="submit"]').first();
  await click(page, submit, 'Enviar solicitação');
  await waitVisible(
    page.getByText(/recebemos|sucesso|em breve/i).first(),
    30_000,
    'confirmação de contato'
  );
  await pause(page, 1000, 'contato enviado');
}

async function openNewReceptionAsOrder(page, associate) {
  const kunkUrl = kunkBaseUrl();
  log('step', 'login e triagem → Pedido');
  await page.goto(`${kunkUrl}/app/acolhimento/triagem`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await waitUrl(page, /\/app\/acolhimento\/triagem/, 30_000, 'triagem');
  await waitVisible(page.locator('table tbody'), 30_000, 'fila de triagem');
  const row = page
    .locator('table tbody tr')
    .filter({ hasText: new RegExp(associate.name, 'i') })
    .first();
  await waitVisible(row, 30_000, 'triagem recém-criada');
  await pause(page, 900, 'mostrar triagem recém-criada');

  const actions = row.getByRole('button', { name: 'Ações de pedido e atendimento' });
  await click(page, actions, 'Opções de pedido e serviço');
  // Mantém o menu aberto de propósito: o vídeo mostra as opções antes da escolha.
  await waitVisible(page.getByRole('menuitem', { name: 'Pedido' }), 10_000, 'opção Pedido');
  await pause(page, 1200, 'opções abertas');
  await click(page, page.getByRole('menuitem', { name: 'Pedido' }), 'opção Pedido');
}

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function updatePrescription(page) {
  log('step', 'pedido — atualizar prescrição');
  const edit = page.getByTestId('edit-prescription');
  await waitVisible(edit, 30_000, 'Editar Prescrição');
  await click(page, edit, 'Editar Prescrição');

  const dialog = page.getByRole('dialog', { name: /Data da Prescrição/i });
  await waitVisible(dialog, 20_000, 'modal Data da Prescrição');

  const existingFiles = await dialog.locator('[data-testid^="file-row-"]').count();
  const chooserPromise = page.waitForEvent('filechooser');
  await click(
    page,
    dialog.getByTestId('file-upload-button'),
    'Enviar nova prescrição'
  );
  const chooser = await chooserPromise;
  await chooser.setFiles(PRESCRIPTION_FIXTURE);
  await dialog
    .locator('[data-testid^="file-row-"]')
    .nth(existingFiles)
    .waitFor({ state: 'visible', timeout: 45_000 });
  log('upload', 'nova prescrição enviada ✓');
  await pause(page, 700, 'prescrição enviada');

  const date = dialog.getByTestId('prescription-date-input').locator('input');
  const today = todayIso();
  log('type', `Data da Prescrição = ${today}`);
  await clickWithCursor(date);
  await date.fill(today);
  await pause(page, 500, 'data de hoje');
  await click(page, dialog.getByTestId('prescription-save'), 'Salvar prescrição');
  await dialog.waitFor({ state: 'hidden', timeout: 30_000 });
  log('prescription', 'arquivo e data atualizados ✓');
}

async function createOrderWithLoggi(page) {
  log('step', 'carrinho — produto, frete Loggi e pedido');
  await waitUrl(page, /\/app\/loja\/novo-pedido/, 45_000, 'novo pedido');
  await waitVisible(page.getByTestId('associate-selected'), 30_000, 'associado selecionado');
  await pause(page, 900, 'carrinho');

  await updatePrescription(page);

  await scrollDownABit(page, { ratio: 0.35, pauseMs: 700, label: 'até produtos' });
  const product = page.locator('[data-testid^="product-"]').first();
  await waitVisible(product, 30_000, 'primeiro produto');
  await click(page, product, 'adicionar primeiro produto');
  await pause(page, 700, 'produto no carrinho');

  await scrollDownABit(page, { ratio: 0.35, pauseMs: 700, label: 'até frete' });
  const quote = page.getByTestId('quote-freight');
  await waitVisible(quote, 30_000, 'Calcular frete');
  await click(page, quote, 'Calcular frete');
  const loggiOption = page
    .getByTestId('freight-option')
    .getByText(/^Loggi\b/i)
    .first();
  await waitVisible(loggiOption, 60_000, 'opção de frete Loggi');
  await pause(page, 1000, 'mostrar opções de frete');
  await click(page, loggiOption, 'selecionar frete Loggi');

  const submit = page.getByTestId('submit-order');
  await waitVisible(submit, 30_000, 'Criar Pedido');
  await click(page, submit, 'Criar Pedido');
  await waitUrl(page, /\/app\/loja\/pedidos/, 60_000, 'lista de pedidos');
}

async function getCreatedOrderId(page) {
  const card = page.locator('[data-testid^="order-card-"]').first();
  await waitVisible(card, 30_000, 'pedido criado');
  const id = String(await card.getAttribute('data-testid')).replace(/^order-card-/, '');
  if (!id) throw new Error('Não foi possível determinar o ID do pedido criado');
  return id;
}

async function addTrackingCode(context, page, orderId) {
  const url = `${kunkBaseUrl()}/api/v1/items/orders/${orderId}`;
  log('api', `PATCH tracking_code do pedido #${orderId}`);
  const response = await context.request.patch(url, {
    data: {
      tracking_code: TRACKING_CODE,
      tracking_code_date: new Date().toISOString(),
    },
    failOnStatusCode: false,
  });
  if (!response.ok()) {
    throw new Error(`Falha ao salvar tracking_code: HTTP ${response.status()}`);
  }
  log('api', `tracking_code=${TRACKING_CODE} ✓`);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitVisible(page.getByTestId('orders-page'), 30_000, 'lista de pedidos atualizada');
}

async function showTrackingDetails(page, orderId) {
  log('step', 'pedidos — detalhes da etiqueta');
  const card = page.getByTestId(`order-card-${orderId}`);
  await waitVisible(card, 30_000, `pedido #${orderId}`);
  await click(
    page,
    card.getByTestId(`tracking-info-${orderId}`),
    'Detalhes do rastreio'
  );
  const modal = page.getByRole('dialog', { name: /Detalhes do rastreio/i });
  await waitVisible(modal, 30_000, 'modal Detalhes do rastreio');
  await waitVisible(
    modal.getByText(TRACKING_CODE, { exact: true }).first(),
    30_000,
    'código de rastreio'
  );

  const content = modal.locator('.MuiDialogContent-root').first();
  await content.evaluate((node) => {
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  });
  await pause(page, 1000, 'rolar até o fim do modal');

  const history = modal.getByTestId('tracking-history');
  await waitVisible(history, 30_000, 'histórico do pedido');
  await moveDemoCursorTo(history);
  await history.evaluate((node) => {
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  });
  await pause(page, 1500, 'rolar histórico do pedido');

  log('tracking', 'histórico do rastreio exibido ✓');
}

async function showOrderDetails(page, orderId) {
  log('step', 'pedidos — detalhes do pedido');
  const trackingModal = page.getByRole('dialog', { name: /Detalhes do rastreio/i });
  await click(
    page,
    trackingModal.getByRole('button', { name: 'Fechar', exact: true }),
    'Fechar detalhes do rastreio'
  );
  await trackingModal.waitFor({ state: 'hidden', timeout: 20_000 });

  const card = page.getByTestId(`order-card-${orderId}`);
  await click(page, card.getByTestId(`details-${orderId}`), 'Detalhes do pedido');
  const modal = page.getByTestId('order-details-modal');
  await waitVisible(modal, 30_000, 'modal Detalhes do pedido');
  await waitVisible(
    modal.getByText(new RegExp(`Detalhes do pedido #${orderId}`)).first(),
    30_000,
    'dados do pedido'
  );

  const content = modal.locator('.MuiDialogContent-root').first();
  await moveDemoCursorTo(content);
  await content.evaluate((node) => {
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  });
  await pause(page, 1500, 'rolar detalhes do pedido');
  log('details', 'detalhes do pedido visíveis ✓');

  await click(
    page,
    modal.getByRole('button', { name: 'Fechar', exact: true }),
    'Fechar detalhes do pedido'
  );
  await modal.waitFor({ state: 'hidden', timeout: 20_000 });
}

async function generateOrderPaymentLink(page, orderId) {
  log('step', 'pedidos — gerar link de pagamento Pagar.me');
  const card = page.getByTestId(`order-card-${orderId}`);
  const payButton = card.getByTestId(`pay-${orderId}`);
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

async function markPaidAndFilter(page, orderId) {
  log('step', 'pedidos — marcar pago e filtrar status');
  const card = page.getByTestId(`order-card-${orderId}`);
  await waitVisible(card, 30_000, `pedido #${orderId}`);
  await pause(page, 700, 'pedido na lista');

  const statusToggle = card.getByTestId(`order-status-${orderId}`);
  await waitVisible(statusToggle, 20_000, 'status Aguardando pagamento');
  await click(page, statusToggle, 'Aguardando pagamento → Pagamento concluído');
  await waitVisible(
    card.getByText('Pagamento concluído', { exact: true }).first(),
    30_000,
    'status Pagamento concluído'
  );
  await pause(page, 1000, 'status atualizado');

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await pause(page, 700, 'voltar ao topo dos filtros');

  const statusSelect = page.getByTestId('orders-status-select');
  await waitVisible(statusSelect, 20_000, 'filtro de status');
  await click(page, statusSelect, 'abrir filtro de status');
  const listbox = page.getByRole('listbox');
  await waitVisible(listbox, 10_000, 'opções de status');
  await pause(page, 1400, 'mostrar opções de status');

  const paidOption = listbox.getByRole('option', { name: 'Pagamento concluído', exact: true });
  await click(page, paidOption, 'filtrar Pagamento concluído');
  await waitVisible(card, 30_000, 'pedido filtrado como pago');
  await pause(page, 900, 'filtro aplicado');
  log('filter', 'Pagamento concluído ativo ✓');
}

const PRODUCTION_ORDERS = [
  { id: 45, name: 'Diego Junqueira' },
  { id: 44, name: 'Carla Gomes' },
  { id: 43, name: 'Bruno Dias' },
];

async function selectOrderCheckbox(page, orderId, label) {
  const card = page.getByTestId(`order-card-${orderId}`);
  await waitVisible(card, 45_000, `pedido #${orderId}`);
  await card.evaluate((node) => node.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  await pause(page, 800, `mostrar ${label}`);
  const checkbox = card.getByTestId(`order-select-${orderId}`);
  await click(page, checkbox, `selecionar ${label}`);
  await pause(page, 400, `${label} marcado`);
}

async function selectOrdersAndProductionReport(page, createdOrderId, holdMs) {
  log('step', 'pedidos — seleção e relatório de produção');

  await selectOrderCheckbox(page, createdOrderId, `pedido criado #${createdOrderId}`);
  for (const order of PRODUCTION_ORDERS) {
    await selectOrderCheckbox(page, order.id, `pedido #${order.id} ${order.name}`);
  }

  await scrollPageToTop(page, { pauseMs: 900, label: 'ações em massa' });
  const reportBtn = page.getByTestId('production-report');
  await waitVisible(reportBtn, 20_000, 'Relatório de produção');
  await click(page, reportBtn, 'Relatório de produção');

  const modal = page.getByRole('dialog', { name: /Relatório de produção/i });
  await waitVisible(modal, 20_000, 'modal Relatório de produção');
  await pause(page, 1000, 'modal aberto');

  await page.evaluate(() => {
    window.__KUNK_DEMO_OPEN_PDF_SAME_TAB = true;
  });

  await click(page, modal.getByRole('button', { name: /Gerar PDF/i }), 'Gerar PDF');
  await page.waitForURL(/blob:/, { timeout: 90_000 });
  await pause(page, 1500, 'PDF aberto');

  await page.mouse.click(
    Math.round(page.viewportSize()?.width / 2 || 640),
    Math.round(page.viewportSize()?.height / 2 || 400)
  );
  await pause(page, 400, 'foco no PDF');
  await pause(page, 5_000, 'tabela Itens para Produção');

  await page.keyboard.press('PageDown');
  await pause(page, 700, 'ir para Registro de dispensação');
  await pause(page, 7_000, 'tabela Registro de dispensação');

  await scrollPdfPagesStepByStep(page);
  log('finish', 'relatório de produção / PDF ✓');
  await pause(page, holdMs, 'hold final no PDF');
}

/** Percorre o PDF do viewer nativo página a página (PageDown), sem pular ao fim. */
async function scrollPdfPagesStepByStep(
  page,
  { steps = 12, stepPauseMs = 900 } = {}
) {
  log('scroll', `PDF — percorrer páginas (${steps} passos, ${fmtSec(stepPauseMs)}/passo)`);
  // Foco no viewer para o PageDown funcionar no Chromium PDF.
  await page.mouse.click(Math.round(page.viewportSize()?.width / 2 || 640), Math.round(page.viewportSize()?.height / 2 || 400));
  await pause(page, 400, 'foco no PDF');
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press('PageDown');
    await pause(page, stepPauseMs, `PDF passo ${i + 1}/${steps}`);
  }
}

async function cleanupDemoData(email) {
  const { cleanupAssociateOrdersAndPrescriptions } = await import('../e2e/helpers/db.js');
  log('cleanup', `removendo pedidos e prescrições de ${email}`);
  const result = await cleanupAssociateOrdersAndPrescriptions(email);
  log(
    'cleanup',
    `✓ pedidos=${result.deletedOrders} | receitas=${result.deletedPrescriptionFiles} | data removida`
  );
}

async function main() {
  const cfg = demoCommonEnv();
  const kunkUrl = kunkBaseUrl();
  const op = operatorCredentials();
  const outDir = demoKindOutDir('contato-pedido', cfg.outDir);
  const holdMs = Number(process.env.DEMO_HOLD_MS || 5_000);

  log('start', '════════════ contato → pedido Loggi ════════════');
  log('start', `kunk=${kunkUrl} | hold=${fmtSec(holdMs)} | outDir=${outDir}`);
  await ensureOperator();
  const associate = await resolveDemoAssociate();
  log('setup', `associado=${associate.email}`);
  await cleanupDemoData(associate.email);

  const { context, page, closeAndSave } = await openDemoBrowser({
    mobile: cfg.mobile,
    channel: cfg.channel,
    slowMo: cfg.slowMo,
    outDir,
    label: 'contato-pedido',
  });
  try {
    await fillPublicContactForm(page, associate);
    await loginOperator(page, kunkUrl, op.email, op.password);
    await openNewReceptionAsOrder(page, associate);
    await createOrderWithLoggi(page);
    const orderId = await getCreatedOrderId(page);
    await addTrackingCode(context, page, orderId);
    await showTrackingDetails(page, orderId);
    await showOrderDetails(page, orderId);
    await generateOrderPaymentLink(page, orderId);
    await markPaidAndFilter(page, orderId);
    await selectOrdersAndProductionReport(page, orderId, holdMs);
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
