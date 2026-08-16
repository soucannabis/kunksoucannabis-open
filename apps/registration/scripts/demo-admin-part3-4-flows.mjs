/**
 * Fluxos compartilhados das demos Admin parte 3 e 4 (e do vídeo unificado).
 */
import { pause } from './demo-lib.mjs';
import {
  click,
  openNavFold,
  visitAndScroll,
  waitVisible,
} from './demo-admin-shared.mjs';

async function smoothScrollTo(page, locator, label, durationMs = 2_500) {
  await waitVisible(locator, 20_000, label);
  await locator.evaluate(
    async (el, ms) => {
      const scroller = document.scrollingElement || document.documentElement;
      const from = scroller.scrollTop;
      const rect = el.getBoundingClientRect();
      const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      const target = Math.min(
        max,
        Math.max(0, from + rect.top - Math.max(80, (window.innerHeight - rect.height) / 2))
      );
      await new Promise((resolve) => {
        const started = performance.now();
        const step = (now) => {
          const progress = Math.min(1, (now - started) / ms);
          scroller.scrollTo({ top: from + (target - from) * progress, behavior: 'instant' });
          if (progress < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
    },
    durationMs
  );
  await pause(page, 600, `após scroll até ${label}`);
}

async function checkPermission(page, name) {
  const checkbox = page.getByRole('checkbox', { name: new RegExp(`^${name}$`, 'i') });
  await waitVisible(checkbox, 15_000, name);
  if (!(await checkbox.isChecked().catch(() => false))) {
    await click(page, checkbox, name);
  }
}

async function enableApiAccess(page) {
  const toggle = page.getByTestId('api-enabled-toggle');
  await waitVisible(toggle, 15_000, 'Habilitar acesso via API');
  const checkbox = toggle.locator('input[type="checkbox"]');
  if (!(await checkbox.isChecked().catch(() => false))) {
    await click(page, toggle, 'Habilitar acesso via API');
  }
  await pause(page, 700, 'API marcada');

  const save = page.getByRole('button', { name: /^Salvar$/i }).first();
  await waitVisible(save, 10_000, 'Salvar (API)');
  await click(page, save, 'Salvar API');
  await waitVisible(
    page.getByText(/Acesso via API habilitado/i),
    20_000,
    'confirmação API habilitada'
  );
  await pause(page, 1_500, 'após salvar API');
}

async function configureAndGenerateApiToken(page) {
  const matrix = page.getByTestId('api-scope-matrix');
  await smoothScrollTo(page, matrix, 'tabela de permissões');

  await checkPermission(page, 'Associados Ler');
  await checkPermission(page, 'Associados Escrever');
  await checkPermission(page, 'Pedidos Ler');
  await checkPermission(page, 'Pedidos Escrever');
  await checkPermission(page, 'Pedidos Excluir');
  await checkPermission(page, 'Atendimentos Ler');
  await pause(page, 1_000, 'permissões preenchidas');

  const generate = page.getByTestId('api-token-submit');
  await smoothScrollTo(page, generate, 'Gerar token');
  await click(page, generate, 'Gerar token');
  await waitVisible(
    page.getByRole('dialog', { name: /Token criado/i }),
    20_000,
    'Token criado'
  );
  await pause(page, 10_000, 'token criado — hold 10s');
}

/** CIAP, aparência, importação, sistema de cadastro, armazenamento. */
export async function runAdminPart3Tour(page) {
  await openNavFold(page, 'Aplicativos');
  await openNavFold(page, 'Kunk');
  await openNavFold(page, 'Configurações');

  await visitAndScroll(page, {
    name: /^CIAP/i,
    href: '/kunk/ciap2',
    heading: /CIAP-2/i,
    openFolds: ['Aplicativos', 'Kunk', 'Configurações'],
    scroll: false,
  });
  await pause(page, 10_000, 'CIAP-2 — hold 10s');

  await visitAndScroll(page, {
    name: 'Aparência',
    href: '/kunk/aparencia',
    heading: 'Aparência',
    openFolds: ['Aplicativos', 'Kunk', 'Configurações'],
  });
  await visitAndScroll(page, {
    name: 'Importação de dados',
    href: '/kunk/importacao',
    heading: 'Importação de dados',
    openFolds: ['Aplicativos', 'Kunk', 'Configurações'],
    scroll: false,
  });
  await pause(page, 6_000, 'Importação de dados — hold 6s');

  await openNavFold(page, 'Sistema de cadastro');
  await visitAndScroll(page, {
    name: 'Configurações',
    href: '/sistema-cadastro',
    heading: 'Sistema de cadastro',
    openFolds: ['Aplicativos', 'Sistema de cadastro'],
  });

  await openNavFold(page, 'Configurações do sistema');
  await visitAndScroll(page, {
    name: 'Armazenamento e Backup',
    href: '/armazenamento',
    heading: 'Armazenamento e Backup',
    openFolds: ['Configurações do sistema'],
  });
}

/** Usuários, credenciais e API (habilitar, permissões e gerar token). */
export async function runAdminPart4Tour(page) {
  await openNavFold(page, 'Webmaster');

  await visitAndScroll(page, {
    name: 'Usuários',
    href: '/usuarios',
    heading: /Usuários|Operadores|Convidar/i,
    openFolds: ['Webmaster'],
    scroll: false,
  });
  await pause(page, 2_000, 'Usuários');

  await visitAndScroll(page, {
    name: 'Credenciais de suporte',
    href: '/credenciais-suporte',
    heading: 'Credenciais de suporte',
    openFolds: ['Webmaster'],
    scroll: false,
  });
  await pause(page, 2_000, 'Credenciais de suporte');

  await visitAndScroll(page, {
    name: /^API$/i,
    href: '/acesso-api',
    heading: /^API$/i,
    openFolds: ['Webmaster'],
    scroll: false,
  });
  await enableApiAccess(page);
  await configureAndGenerateApiToken(page);
}
