/**
 * Fluxos compartilhados das demos Admin parte 1 e 2 (e do vídeo unificado).
 */
import { pause, typeOverDuration } from './demo-lib.mjs';
import {
  click,
  openNavFold,
  scrollPageDown,
  scrollPageTour,
  visitAndScroll,
  waitVisible,
} from './demo-admin-shared.mjs';

function logStep(step, detail) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${step} — ${detail}`);
}

async function smoothScrollTo(page, locator, label, { durationMs = 2_500, block = 'center' } = {}) {
  await waitVisible(locator, 20_000, label);
  logStep('scroll', `até ${label}`);
  await locator.evaluate(
    async (el, { ms, align }) => {
      const candidates = [
        document.querySelector('main.admin-main'),
        document.querySelector('main'),
        document.scrollingElement,
        document.documentElement,
        document.body,
      ].filter(Boolean);
      const scroller =
        candidates.find((node) => node.scrollHeight > node.clientHeight + 8) ||
        document.scrollingElement ||
        document.documentElement;
      const current = scroller.scrollTop;
      const rect = el.getBoundingClientRect();
      const scrollerRect =
        scroller === document.scrollingElement ||
        scroller === document.documentElement ||
        scroller === document.body
          ? { top: 0, height: window.innerHeight }
          : scroller.getBoundingClientRect();
      const offset =
        align === 'start'
          ? 96
          : Math.max(0, (scrollerRect.height - Math.min(rect.height, scrollerRect.height)) / 2);
      const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      const target = Math.min(
        max,
        Math.max(0, current + rect.top - scrollerRect.top - offset)
      );
      await new Promise((resolve) => {
        const started = performance.now();
        const step = (now) => {
          const progress = Math.min(1, (now - started) / ms);
          scroller.scrollTo({ top: current + (target - current) * progress, behavior: 'instant' });
          if (progress < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
    },
    { ms: durationMs, align: block }
  );
  await pause(page, 600, `após scroll até ${label}`);
}

async function smoothScrollToBoundary(page, direction, label, durationMs = 4_000) {
  logStep('scroll', `${direction === 'down' ? 'até o fim' : 'de volta ao topo'} — ${label}`);
  await page.evaluate(
    async ({ dir, ms }) => {
      const candidates = [
        document.querySelector('main.admin-main'),
        document.querySelector('main'),
        document.scrollingElement,
        document.documentElement,
        document.body,
      ].filter(Boolean);
      const scroller =
        candidates.find((node) => node.scrollHeight > node.clientHeight + 8) ||
        document.scrollingElement ||
        document.documentElement;
      const from = scroller.scrollTop;
      const to = dir === 'down' ? Math.max(0, scroller.scrollHeight - scroller.clientHeight) : 0;
      await new Promise((resolve) => {
        const started = performance.now();
        const step = (now) => {
          const progress = Math.min(1, (now - started) / ms);
          scroller.scrollTo({ top: from + (to - from) * progress, behavior: 'instant' });
          if (progress < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
    },
    { dir: direction, ms: durationMs }
  );
  await pause(page, 600, `após ${label}`);
}

async function editHelpTopicOptions(page) {
  logStep('form', 'Como podemos ajudar — remover Outro e criar nova opção');
  const editor = page.locator('.triage-options-editor').first();
  await waitVisible(editor, 20_000, 'editor de opções (help_topic)');

  const rows = editor.locator('.triage-options-editor__row');
  const count = await rows.count();
  let removed = false;
  for (let i = 0; i < count; i += 1) {
    const input = rows.nth(i).locator('input[type="text"]');
    const value = ((await input.inputValue().catch(() => '')) || '').trim();
    if (/^Outro$/i.test(value)) {
      await click(
        page,
        rows.nth(i).getByRole('button', { name: /Remover opção/i }),
        `Remover opção Outro (#${i + 1})`
      );
      removed = true;
      break;
    }
  }
  if (!removed) {
    const last = rows.last();
    await click(
      page,
      last.getByRole('button', { name: /Remover opção/i }),
      'Remover última opção (fallback Outro)'
    );
  }
  await pause(page, 800, 'após remover Outro');

  await click(page, editor.getByRole('button', { name: /^Adicionar opção$/i }), 'Adicionar opção');
  const newInput = editor.locator('.triage-options-editor__input').last();
  await waitVisible(newInput, 10_000, 'nova opção vazia');
  await click(page, newInput, 'foco nova opção');
  await typeOverDuration(newInput, 'Uma nova opção', 1_600, 'Opção');
  await pause(page, 900, 'nova opção preenchida');
}

async function enableDarkTheme(page) {
  const dark = page.getByRole('checkbox', { name: /Padrão escuro/i });
  await waitVisible(dark, 15_000, 'Padrão escuro');
  if (!(await dark.isChecked().catch(() => false))) {
    await click(page, dark, 'Padrão escuro');
  }
  await pause(page, 900, 'tema escuro');
}

async function applyAssociationFeeBulk(page) {
  const selectAll = page.getByTestId('types-select-all');
  await waitVisible(selectAll, 15_000, 'Selecionar todos os tipos');
  if (!(await selectAll.isChecked().catch(() => false))) {
    await click(page, selectAll, 'Selecionar todos os tipos');
  }
  await pause(page, 800, 'todos selecionados');

  await click(
    page,
    page.getByRole('button', { name: /Alterar campos/i }),
    'Alterar campos…'
  );
  const modal = page.getByTestId('types-bulk-modal');
  await waitVisible(modal, 15_000, 'modal Alterar tipos em massa');

  const feeToggle = page.getByTestId('bulk-touch-fee');
  await click(page, feeToggle, 'Taxa da associação');
  await pause(page, 500, 'taxa marcada');

  const feeInput = modal.locator('input[type="number"]').first();
  await waitVisible(feeInput, 10_000, 'campo Taxa da associação');
  await click(page, feeInput, 'foco taxa');
  await typeOverDuration(feeInput, '10', 900, 'Taxa');
  await pause(page, 700, 'taxa = 10');

  await click(
    page,
    modal.getByRole('button', { name: /Aplicar aos selecionados/i }),
    'Aplicar aos selecionados'
  );
  await waitVisible(
    page.getByText(/\d+ tipo\(s\) atualizado\(s\)/i),
    20_000,
    'confirmação tipos atualizados'
  );
  await pause(page, 1_500, 'após aplicar taxas');
}

/** Associação + dados + triagem (formulário, status, módulos + salvar). */
export async function runAdminPart1Tour(page) {
  await visitAndScroll(page, {
    name: 'Dados da associação',
    href: '/dados-associacao',
    heading: 'Dados da associação',
  });

  await openNavFold(page, 'Aplicativos');
  await openNavFold(page, 'Kunk');
  await openNavFold(page, 'Triagem');

  await visitAndScroll(page, {
    name: 'Formulário',
    href: '/triagem/formulario',
    heading: 'Formulário público',
    openFolds: ['Aplicativos', 'Kunk', 'Triagem'],
    scroll: false,
  });
  const optionsEditor = page.locator('.triage-options-editor').first();
  await smoothScrollTo(page, optionsEditor, 'Como podemos ajudar');
  await editHelpTopicOptions(page);
  const darkTheme = page.getByRole('checkbox', { name: /Padrão escuro/i });
  await smoothScrollTo(page, darkTheme, 'Padrão escuro');
  await enableDarkTheme(page);
  await smoothScrollToBoundary(page, 'down', 'fim do Formulário');
  await pause(page, 3_000, 'Formulário no fim');
  await smoothScrollToBoundary(page, 'up', 'topo do Formulário');

  await visitAndScroll(page, {
    name: 'Status da fila',
    href: '/triagem/status',
    heading: 'Status da fila',
    openFolds: ['Aplicativos', 'Kunk', 'Triagem'],
    scroll: false,
  });
  await click(
    page,
    page.getByRole('button', { name: /^Adicionar status$/i }),
    'Adicionar status'
  );
  await pause(page, 2_000, 'após Adicionar status');

  await visitAndScroll(page, {
    name: 'Módulos',
    href: '/triagem/modulos',
    heading: /^Módulos$/i,
    openFolds: ['Aplicativos', 'Kunk', 'Triagem'],
    scroll: false,
  });
  const docsToggle = page.getByTestId('triage-associate-docs-toggle');
  await waitVisible(docsToggle, 15_000, 'toggle Documentos / dados do associado');
  const docsCheckbox = docsToggle.locator('input[type="checkbox"]');
  if (!(await docsCheckbox.isChecked().catch(() => false))) {
    await click(page, docsToggle, 'Documentos / dados do associado');
  } else {
    await click(page, docsToggle, 'Documentos (desmarcar para reativar)');
    await pause(page, 600, 'desmarcado');
    await click(page, docsToggle, 'Documentos / dados do associado');
  }
  await pause(page, 1_000, 'módulo habilitado');
  await click(
    page,
    page.getByRole('button', { name: /^Salvar módulos$/i }),
    'Salvar módulos'
  );
  await pause(page, 2_000, 'após Salvar módulos');
}

/** Profissionais (taxas) + loja + permissões. */
export async function runAdminPart2Tour(page) {
  await openNavFold(page, 'Aplicativos');
  await openNavFold(page, 'Kunk');
  await openNavFold(page, 'Profissionais');

  await visitAndScroll(page, {
    name: 'Configurações',
    href: '/kunk/configuracao-profissionais',
    heading: 'Configuração de profissionais',
    openFolds: ['Aplicativos', 'Kunk', 'Profissionais'],
    scroll: false,
  });
  await scrollPageTour(page, 'Configuração de profissionais');
  await applyAssociationFeeBulk(page);
  await scrollPageDown(page, 'após taxas — profissionais', { holdMs: 10_000 });

  await openNavFold(page, 'Loja');
  await visitAndScroll(page, {
    name: 'Status dos pedidos',
    href: '/loja/status-pedidos',
    heading: 'Status dos pedidos',
    openFolds: ['Aplicativos', 'Kunk', 'Loja'],
    scroll: false,
  });
  await click(
    page,
    page.getByRole('button', { name: /^Adicionar status$/i }),
    'Adicionar status'
  );
  await pause(page, 2_000, 'após Adicionar status');

  await openNavFold(page, 'Configurações');
  await visitAndScroll(page, {
    name: 'Permissões de acesso',
    href: '/kunk/permissoes',
    heading: 'Permissões de acesso',
    openFolds: ['Aplicativos', 'Kunk', 'Configurações'],
  });
}
