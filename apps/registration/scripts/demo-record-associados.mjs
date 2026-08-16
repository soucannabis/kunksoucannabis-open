/**
 * Demo gravada: página de associados e modal completo de Ana Silva.
 *
 * Antes do vídeo, cria um paciente permanente para Ana e 3 pedidos + 3
 * serviços temporários para a aba Histórico. Apenas os itens temporários
 * são apagados no encerramento.
 *
 * Fluxo: limpa Anas Silva duplicadas → scroll da lista → menu Filtrar (15s) → modal.
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
  kunkBaseUrl,
  loginOperator,
  operatorCredentials,
  resolveDemoAssociate,
  waitUrl,
  waitVisible,
} from './demo-triagem-shared.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRESCRIPTION_FIXTURE = join(__dirname, '..', 'demos', 'fixtures', 'receita.jpg');
const EXAM_FIXTURE = join(__dirname, '..', 'demos', 'fixtures', 'cnh-aberta.jpg');
const ANNOTATION = 'Associada contactada para acompanhamento da consulta de retorno.';

async function click(page, locator, label) {
  log('click', label);
  await clickWithCursor(locator);
  log('click', `✓ ${label}`);
}

/** Duração de cada trecho do scroll da listagem (4s descendo + 4s subindo). */
const SCROLL_TRAVEL_MS = 4_000;
/** A demo mostra só metade da listagem antes de voltar ao topo. */
const SCROLL_TARGET_RATIO = 0.5;

/**
 * Rola a janela quadro a quadro até o alvo (ou de volta ao topo).
 *
 * Posicionamos com `behavior: 'instant'` a cada frame: usar `'smooth'` dentro
 * de um laço reinicia a animação nativa a cada passo, o que travava a página
 * por alguns segundos e depois dava um salto até o fim.
 */
async function scrollWindowFor(page, totalMs, direction, label) {
  const duration = Math.max(500, Number(totalMs) || 0);
  log('scroll', `${direction === 'down' ? '↓' : '↑'} página ${label} em ${fmtSec(duration)}`);
  await page.evaluate(
    async ({ ms, dir, ratio }) => {
      const doc = document.scrollingElement || document.documentElement;
      const max = Math.max(0, doc.scrollHeight - doc.clientHeight);
      const target = Math.round(max * ratio);
      const from = dir === 'down' ? 0 : target;
      const to = dir === 'down' ? target : 0;
      doc.scrollTo({ top: from, behavior: 'instant' });

      await new Promise((resolve) => {
        const begun = performance.now();
        const step = () => {
          // Velocidade constante: com ease-in-out a página quase não saía do
          // lugar no primeiro segundo e depois disparava até o fim.
          const progress = Math.min(1, (performance.now() - begun) / ms);
          doc.scrollTo({ top: from + (to - from) * progress, behavior: 'instant' });
          if (progress >= 1) {
            resolve();
            return;
          }
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    },
    { ms: duration, dir: direction, ratio: SCROLL_TARGET_RATIO }
  );
  await pause(page, 400, `fim ${label}`);
}

/**
 * Espera a listagem terminar de renderizar.
 *
 * Sem isso o scroll começa com a tabela ainda montando: a altura medida é
 * pequena, o trajeto fica minúsculo e o resultado no vídeo é um solavanco.
 */
async function waitListStable(page, label) {
  await waitVisible(page.locator('table tbody tr').first(), 30_000, `linhas de ${label}`);
  const deadline = Date.now() + 10_000;
  let previous = -1;
  while (Date.now() < deadline) {
    const height = await page.evaluate(
      () => (document.scrollingElement || document.documentElement).scrollHeight
    );
    if (height === previous) {
      log('wait-el', `✓ ${label} estabilizada (scrollHeight=${height}px)`);
      return;
    }
    previous = height;
    await page.waitForTimeout(400);
  }
  log('warn', `${label} não estabilizou em 10s — seguindo assim mesmo`);
}

/** Desce suave até a metade da listagem, pausa e volta ao topo. */
async function scrollListRoundTrip(page, label) {
  await waitListStable(page, label);
  const max = await page.evaluate(() => {
    const doc = document.scrollingElement || document.documentElement;
    return Math.max(0, doc.scrollHeight - doc.clientHeight);
  });
  const target = Math.round(max * SCROLL_TARGET_RATIO);
  log(
    'scroll',
    `${label} | rolável=${max}px | alvo=${target}px (metade) | ${fmtSec(SCROLL_TRAVEL_MS)} por trecho`
  );
  await scrollWindowFor(page, SCROLL_TRAVEL_MS, 'down', `${label} topo à metade`);
  await pause(page, 3_000, `${label} na metade da lista`);
  await scrollWindowFor(page, SCROLL_TRAVEL_MS, 'up', `${label} metade ao topo`);
}

async function scrollDialogContent(page, { returnToTop = false, label }) {
  const dialog = page.getByRole('dialog').filter({ hasText: /Dados Pessoais|Pacientes|Prescritor|Anotações|Documentos|Histórico/i }).first();
  const content = dialog.locator('.MuiDialogContent-root').first();
  await waitVisible(content, 15_000, `conteúdo ${label}`);
  log('scroll', `modal ${label} até o fim`);
  await content.evaluate(
    async (el, { backToTop }) => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const candidates = [el, ...el.querySelectorAll('*')].filter((candidate) => {
        const style = getComputedStyle(candidate);
        return (
          /(auto|scroll)/.test(style.overflowY) &&
          candidate.scrollHeight > candidate.clientHeight + 4
        );
      });
      const scroller = candidates.sort(
        (a, b) =>
          b.scrollHeight - b.clientHeight - (a.scrollHeight - a.clientHeight)
      )[0];
      if (!scroller) throw new Error('Conteúdo interno sem área rolável');
      const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      const step = Math.max(56, Math.round(scroller.clientHeight * 0.35));
      for (let y = 0; y < max; y += step) {
        scroller.scrollTo({ top: Math.min(max, y + step), behavior: 'smooth' });
        await sleep(420);
      }
      scroller.scrollTo({ top: max, behavior: 'smooth' });
      await sleep(800);
      if (backToTop) {
        for (let y = max; y > 0; y -= step) {
          scroller.scrollTo({ top: Math.max(0, y - step), behavior: 'smooth' });
          await sleep(350);
        }
        scroller.scrollTo({ top: 0, behavior: 'smooth' });
        await sleep(700);
      }
    },
    { backToTop: returnToTop }
  );
}

async function showFiltersMenu(page) {
  log('step', 'abrir menu Filtrar e mostrar opções');
  const filterBtn = page.getByRole('button', { name: /^(Filtrar|Filtro ativo)$/i });
  await waitVisible(filterBtn, 20_000, 'botão Filtrar');
  await click(page, filterBtn, 'Filtrar');

  const menu = page.getByRole('menu');
  await waitVisible(menu, 10_000, 'menu de filtros');
  await waitVisible(menu.getByRole('menuitem', { name: /^Todos$/i }), 10_000, 'opção Todos');
  await pause(page, 15_000, 'mostrar opções do filtro');

  await page.keyboard.press('Escape');
  await menu.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => null);
  await pause(page, 600, 'menu de filtro fechado');
}

async function openAssociate(page) {
  await waitVisible(page.locator('table tbody tr').first(), 30_000, 'lista de associados');
  const firstAvatar = page
    .locator('table tbody tr')
    .first()
    .getByRole('button', { name: /^Abrir /i });
  await waitVisible(firstAvatar, 30_000, 'avatar do primeiro associado');
  await click(page, firstAvatar, 'avatar do primeiro associado');
  const dialog = page.getByRole('dialog').filter({ hasText: /Dados Pessoais/i }).first();
  await waitVisible(dialog, 30_000, 'modal do associado');
  return dialog;
}

async function choosePrescriberAndPrescription(page, dialog) {
  await click(page, dialog.getByRole('tab', { name: 'Prescritor' }), 'aba Prescritor');
  await pause(page, 700, 'aba Prescritor');

  const prescriber = dialog.getByLabel('Prescritor');
  await click(page, prescriber, 'abrir lista de prescritores');
  const listbox = page.getByRole('listbox');
  await waitVisible(listbox, 15_000, 'lista de prescritores');
  await pause(page, 1400, 'mostrar todos os prescritores');
  const nuno = listbox.getByRole('option').filter({ hasText: /Nuno\s+Pereira/i }).first();
  await waitVisible(nuno, 15_000, 'Nuno Pereira');
  await click(page, nuno, 'selecionar Nuno Pereira');

  const date = dialog.getByLabel('Data da receita');
  if (await date.inputValue()) {
    throw new Error('A data da receita deveria iniciar vazia');
  }
  await click(page, dialog.getByRole('button', { name: /Salvar prescritor/i }), 'Salvar prescritor');
  await pause(page, 900, 'prescritor salvo');

  await date.fill(new Date().toISOString().slice(0, 10));
  await pause(page, 900, 'data da receita preenchida');

  const prescriptionInput = dialog.getByTestId('file-upload-input');
  await prescriptionInput.setInputFiles(PRESCRIPTION_FIXTURE);
  await pause(page, 3_000, 'receita enviada');
}

async function annotationAndDocuments(page, dialog) {
  await click(page, dialog.getByRole('tab', { name: 'Anotações' }), 'aba Anotações');
  const annotation = dialog.getByLabel('Nova anotação');
  await click(page, annotation, 'Nova anotação');
  await typeOverDuration(annotation, ANNOTATION, 2200, 'Anotação');
  await click(page, dialog.getByRole('button', { name: /^Adicionar$/i }), 'Adicionar anotação');
  await pause(page, 900, 'anotação adicionada');

  await click(page, dialog.getByRole('tab', { name: 'Documentos' }), 'aba Documentos');
  const upload = dialog.getByTestId('file-upload');
  await waitVisible(upload, 20_000, 'documentos do associado');

  const kind = upload.getByTestId('file-upload-kind');
  await click(page, kind, 'abrir Tipo do documento');
  const listbox = page.getByRole('listbox');
  await waitVisible(listbox, 10_000, 'tipos de documento');
  await pause(page, 1400, 'mostrar tipos de documento');
  await click(page, listbox.getByRole('option', { name: /^Exame$/i }), 'selecionar Exame');
  await upload.getByTestId('file-upload-input').setInputFiles(EXAM_FIXTURE);
  await waitVisible(
    upload.locator('[data-testid^="file-row-"]').last(),
    20_000,
    'exame na lista de documentos'
  );
  await pause(page, 2500, 'exame enviado');
}

async function finishOnTermDownload(page, dialog) {
  const termButton = dialog.getByRole('button', { name: /Termo do Associado/i });
  await waitVisible(termButton, 20_000, 'Termo do Associado');
  await click(page, termButton, 'Termo do Associado');
  const download = page.getByRole('menuitem', { name: /Download do termo/i });
  await waitVisible(download, 10_000, 'Download do termo');
  await moveDemoCursorTo(download, { durationMs: 500, settleMs: 100 });
  await download.hover();
  log('finish', 'cursor sobre Download do termo');
  await pause(page, 5_000, 'menu de download');
}

async function main() {
  const cfg = demoCommonEnv();
  const kunkUrl = kunkBaseUrl();
  const op = operatorCredentials();
  const outDir = demoKindOutDir('associados', cfg.outDir);
  let demoData = null;

  log('start', '════════════ página de associados ════════════');
  await ensureOperator();
  // Mantém a Ana Silva canônica das demos (ou DEMO_ASSOCIATE_EMAIL).
  if (!process.env.DEMO_ASSOCIATE_EMAIL) {
    process.env.DEMO_ASSOCIATE_EMAIL = 'associado@soucannabis.ong.br';
  }
  const associate = await resolveDemoAssociate();
  const {
    cleanupDuplicateAnaSilvaAssociates,
    seedAssociateHistoryDemo,
    cleanupHistoryDemoData,
  } = await import('../e2e/helpers/db.js');
  const dedupe = await cleanupDuplicateAnaSilvaAssociates(associate.email);
  log(
    'setup',
    `Ana Silva única: keep=${dedupe.keptEmail} | removidas=${dedupe.deletedDuplicates}` +
      (dedupe.deletedEmails.length ? ` [${dedupe.deletedEmails.join(', ')}]` : '')
  );
  demoData = await seedAssociateHistoryDemo(associate.email);
  log('setup', `paciente=${demoData.patient.id} | pedidos=${demoData.orderIds.join(',')} | serviços=${demoData.serviceIds.join(',')}`);

  const { page, closeAndSave } = await openDemoBrowser({
    mobile: cfg.mobile,
    channel: cfg.channel,
    slowMo: cfg.slowMo,
    outDir,
    label: 'associados',
  });

  try {
    await loginOperator(page, kunkUrl, op.email, op.password);
    await page.goto(`${kunkUrl}/app/acolhimento/associados`, { waitUntil: 'domcontentloaded' });
    await waitUrl(page, /\/app\/acolhimento\/associados/, 30_000, 'associados');
    await waitVisible(page.getByRole('heading', { name: 'Gestão de associados' }), 30_000, 'página associados');

    await scrollListRoundTrip(page, 'lista de associados');

    await showFiltersMenu(page);

    const dialog = await openAssociate(page);
    await scrollDialogContent(page, { label: 'Dados Pessoais' });

    await click(page, dialog.getByRole('tab', { name: 'Pacientes' }), 'aba Pacientes');
    const patientBlock = dialog.getByRole('button', { name: /Paciente Demo Associados/i }).first();
    await waitVisible(patientBlock, 15_000, 'bloco do paciente');
    await click(page, patientBlock, 'abrir dados do paciente');
    await scrollDialogContent(page, { label: 'Pacientes', returnToTop: true });

    await choosePrescriberAndPrescription(page, dialog);
    await annotationAndDocuments(page, dialog);

    await click(page, dialog.getByRole('tab', { name: 'Histórico' }), 'aba Histórico');
    await pause(page, 8_000, 'histórico de pedidos e serviços');

    await finishOnTermDownload(page, dialog);
  } finally {
    log('browser', 'fechando e salvando vídeo…');
    try {
      await closeAndSave();
    } finally {
      if (demoData) {
        const { cleanupHistoryDemoData } = await import('../e2e/helpers/db.js');
        const result = await cleanupHistoryDemoData(demoData);
        log('cleanup', `✓ pedidos=${result.deletedOrders} | serviços=${result.deletedServices}`);
      }
    }
  }
}

main().catch((err) => {
  console.error('\nFALHA:', err?.message || err);
  process.exit(1);
});
