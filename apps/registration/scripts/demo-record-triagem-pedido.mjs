/**
 * Demo gravada: Triagem → Pedido completo → Pagamento concluído + filtro.
 *
 * Continuação da demo de triagem: usa o 1º item da fila (Espera), encaminha
 * para Novo Pedido, cria o pedido, marca Pagamento concluído e filtra por esse status.
 *
 * Pré-requisitos:
 *   - API :4250, Kunk :4257, Edge
 *   - Associado no banco (seed @demo.kunk.local)
 *   - Produtos publicados (seed)
 *
 * Uso:
 *   cd apps/registration && npm run demo:triagem-pedido
 */
import {
  demoCommonEnv,
  demoKindOutDir,
  openDemoBrowser,
  pause,
  scrollDownABit,
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

async function createOrderFromCart(page) {
  log('step', 'carrinho — criar pedido');
  await waitUrl(page, /\/app\/loja\/novo-pedido/, 45_000, 'novo pedido');
  await waitVisible(page.getByTestId('cart-page'), 30_000, 'cart-page');
  await waitVisible(
    page.getByTestId('associate-selected'),
    30_000,
    'associado pré-carregado'
  );
  await pause(page, 1200, 'carrinho com associado');

  const filter = page.getByLabel('Filtrar por nome');
  if (await filter.count()) {
    log('type', 'Filtrar por nome = "Spectrum"');
    await filter.click();
    await filter.fill('');
    await filter.pressSequentially('Spectrum', { delay: 50 });
    await pause(page, 800, 'filtro catálogo');
  }

  const productBtn = page.locator('[data-testid^="product-"]').first();
  await waitVisible(productBtn, 30_000, 'botão adicionar produto');
  log('click', 'adicionar produto (1º do catálogo filtrado)');
  await productBtn.click();
  await pause(page, 800, 'produto no carrinho');

  await scrollDownABit(page, {
    ratio: 0.25,
    pauseMs: 600,
    label: 'carrinho → submit',
  });

  const submit = page.getByTestId('submit-order');
  await waitVisible(submit, 20_000, 'Criar Pedido');
  log('click', 'Criar Pedido');
  await submit.click();
  await waitUrl(page, /\/app\/loja\/pedidos/, 60_000, 'lista de pedidos');
  log('orders', 'pedido criado ✓');
}

async function markOrderPaidAndFilter(page) {
  log('step', 'pedidos — Pagamento concluído + filtro');
  await waitVisible(page.getByTestId('orders-page'), 30_000, 'orders-page');
  await pause(page, 1200, 'lista pedidos');

  const card = page.locator('[data-testid^="order-card-"]').first();
  await waitVisible(card, 30_000, '1º card de pedido');
  await pause(page, 800, 'mostrar pedido criado');

  const statusToggle = card.locator('[data-testid^="order-status-"]').first();
  await waitVisible(statusToggle, 20_000, 'toggle status do pedido');
  log('click', 'alternar status → Pagamento concluído');
  await statusToggle.click();
  await pause(page, 1000, 'após toggle status');

  await waitVisible(
    card.getByText(/Pagamento concluído/i).first(),
    20_000,
    'texto Pagamento concluído no card'
  );
  log('orders', 'status = Pagamento concluído ✓');

  const showCounts = page.getByTestId('show-status-counts');
  if (await showCounts.isVisible().catch(() => false)) {
    log('click', 'Ver contabilidade dos status');
    await showCounts.click();
    await pause(page, 1500, 'carregando facets');
  }

  const paidChip = page.getByTestId('status-chip-Pagamento concluído');
  await waitVisible(paidChip, 30_000, 'chip Pagamento concluído');
  log('click', 'filtro chip Pagamento concluído');
  await paidChip.click();
  await pause(page, 1200, 'após filtrar pagos');

  await waitVisible(
    page.locator('[data-testid^="order-card-"]').first(),
    20_000,
    'pedido no filtro Pagamento concluído'
  );
  await waitVisible(
    page
      .locator('[data-testid^="order-card-"]')
      .first()
      .getByText(/Pagamento concluído/i)
      .first(),
    15_000,
    'card filtrado com Pagamento concluído'
  );
  log('finish', 'pedido pago visível no filtro ✓');
}

async function main() {
  const cfg = demoCommonEnv();
  const format = cfg.mobile ? 'mobile' : 'desktop';
  const outDir = demoKindOutDir('triagem-pedido', cfg.outDir);
  const kunkUrl = kunkBaseUrl();
  const op = operatorCredentials();

  log('start', '══════════════════════════════════════');
  log(
    'start',
    `demo=triagem-pedido | format=${format} | slowMo=${cfg.slowMo}ms | hold=${fmtSec(cfg.holdMs)}`
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
    slowMo: cfg.slowMo,
    outDir,
    label: 'triagem-pedido',
  });

  try {
    await seedLinkedReception(context.request, kunkUrl, associate, 'pedido');

    await loginOperator(page, kunkUrl, op.email, op.password);
    await pause(page, 800, 'após login');

    log('step', '1/3 triagem → Pedido');
    await openTriageEspera(page, kunkUrl);
    await firstTriageRow(page, associate.name);
    await pause(page, 1000, 'mostrar 1ª linha');
    await openActionFromFirstRow(page, 'Pedido');

    log('step', '2/3 criar pedido');
    await createOrderFromCart(page);

    log('step', '3/3 pagar + filtrar');
    await markOrderPaidAndFilter(page);
    await pause(page, cfg.holdMs, 'hold final pedidos pagos');
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
