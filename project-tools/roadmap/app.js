const STORAGE_KEY = 'kunk-roadmap-checks-v1';
const ORIGINS_KEY = 'kunk-roadmap-app-origins-v1';
const API_BASE = '';

/** Origens locais dos apps (vite.config). Sobrescreva em localStorage `kunk-roadmap-app-origins-v1`. */
const DEFAULT_APP_ORIGINS = {
  admin: 'http://127.0.0.1:4256',
  kunk: 'http://127.0.0.1:4257',
  registration: 'http://127.0.0.1:4255',
  'doc-sign': 'http://127.0.0.1:4258',
};

const TEST_DEFS = [
  { key: 'e2e', label: 'e2e', hint: 'Playwright — abre a UI para acompanhar' },
  { key: 'api', label: 'API / unit', hint: 'Suite no kunk-api ou Vitest — gera relatório' },
  { key: 'manual', label: 'Manual', hint: 'Validação humana — play abre a página do app' },
];

/** @type {any} */
let tree = null;
/** @type {Record<string, any>} */
let registry = { features: {} };
/** @type {Record<string, { e2e?: boolean, api?: boolean, manual?: boolean, notes?: string }>} */
let checks = loadChecks();
/** @type {Record<string, boolean>} */
let apiReportExists = {};
let selectedId = null;
/** @type {Set<string>} */
let expanded = new Set();
let filterPending = false;
let filterApp = '';

const elTree = document.getElementById('tree');
const elDetail = document.getElementById('detail');
const elStats = document.getElementById('stats');
const elModal = document.getElementById('report-modal');
const elModalBody = document.getElementById('report-modal-body');

function loadChecks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function saveChecks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(checks));
}

function walk(node, fn, parentApp = null) {
  const app = node.app || parentApp;
  fn(node, app);
  for (const child of node.children || []) walk(child, fn, app);
}

function isLeaf(node) {
  return !node.children || node.children.length === 0;
}

function getCheck(id) {
  return checks[id] || {};
}

function featureTests(featureId) {
  return registry.features?.[featureId] || {};
}

function leafStatus(node) {
  const c = getCheck(node.id);
  const keys = TEST_DEFS.map((t) => t.key);
  const done = keys.filter((k) => Boolean(c[k])).length;
  if (done === 0) return { kind: 'empty', done, total: keys.length, ratio: 0 };
  if (done === keys.length) return { kind: 'ok', done, total: keys.length, ratio: 1 };
  return { kind: 'partial', done, total: keys.length, ratio: done / keys.length };
}

function aggregate(node) {
  if (isLeaf(node)) return leafStatus(node);
  let done = 0;
  let total = 0;
  for (const child of node.children) {
    const s = aggregate(child);
    done += s.done;
    total += s.total;
  }
  const ratio = total ? done / total : 0;
  let kind = 'empty';
  if (ratio >= 1) kind = 'ok';
  else if (ratio > 0) kind = 'partial';
  return { kind, done, total, ratio };
}

function nodeMatchesFilters(node, app) {
  if (filterApp && app !== filterApp) return false;
  if (!filterPending) return true;
  if (!isLeaf(node)) {
    return (node.children || []).some((c) => nodeMatchesFilters(c, c.app || app));
  }
  return leafStatus(node).kind !== 'ok';
}

function ensureDefaultExpanded() {
  if (expanded.size) return;
  expanded.add(tree.id);
  for (const child of tree.children || []) expanded.add(child.id);
}

function renderStats() {
  const s = aggregate(tree);
  const leaves = [];
  walk(tree, (n) => {
    if (isLeaf(n)) leaves.push(n);
  });
  const ok = leaves.filter((n) => leafStatus(n).kind === 'ok').length;
  const partial = leaves.filter((n) => leafStatus(n).kind === 'partial').length;
  const empty = leaves.length - ok - partial;
  elStats.innerHTML = `
    <div class="stat-card"><div class="label">Features</div><div class="value">${leaves.length}</div></div>
    <div class="stat-card"><div class="label">Completas</div><div class="value">${ok}</div></div>
    <div class="stat-card"><div class="label">Parciais</div><div class="value">${partial}</div></div>
    <div class="stat-card"><div class="label">Pendentes</div><div class="value">${empty}</div></div>
    <div class="stat-card">
      <div class="label">Progresso</div>
      <div class="value">${Math.round(s.ratio * 100)}%</div>
      <div class="progress-bar"><span style="width:${Math.round(s.ratio * 100)}%"></span></div>
    </div>
  `;
}

function badgeHtml(status) {
  return `<span class="badge ${status.kind}">${status.done}/${status.total}</span>`;
}

function playIcon() {
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`;
}

function renderTree() {
  ensureDefaultExpanded();
  elTree.innerHTML = '';
  const root = document.createElement('ul');
  root.appendChild(renderNode(tree, tree.app || null));
  elTree.appendChild(root);
}

function renderNode(node, parentApp) {
  const app = node.app || parentApp;
  const li = document.createElement('li');
  const matches = nodeMatchesFilters(node, app);
  const hasChildren = !isLeaf(node);
  const open = expanded.has(node.id);

  if (!matches && isLeaf(node)) li.hidden = true;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `node${selectedId === node.id ? ' is-selected' : ''}`;

  const twist = document.createElement('span');
  twist.className = `twist${hasChildren ? '' : ' is-leaf'}`;
  twist.textContent = hasChildren ? (open ? '▾' : '▸') : '•';

  const label = document.createElement('span');
  label.className = 'node-label';
  const title = document.createElement('strong');
  title.textContent = node.label;
  label.appendChild(title);
  if (node.path) {
    const path = document.createElement('span');
    path.textContent = node.path;
    label.appendChild(path);
  }

  btn.appendChild(twist);
  btn.appendChild(label);
  btn.insertAdjacentHTML('beforeend', badgeHtml(aggregate(node)));

  btn.addEventListener('click', () => {
    selectedId = node.id;
    if (hasChildren) toggleExpand(node.id);
    render();
  });
  twist.addEventListener('click', (e) => {
    e.stopPropagation();
    if (hasChildren) {
      toggleExpand(node.id);
      render();
    }
  });

  li.appendChild(btn);

  if (hasChildren && open) {
    const ul = document.createElement('ul');
    let anyVisible = false;
    for (const child of node.children) {
      const childLi = renderNode(child, app);
      if (!childLi.hidden) anyVisible = true;
      ul.appendChild(childLi);
    }
    li.appendChild(ul);
    if (filterPending && !anyVisible && node.id !== tree.id) li.hidden = true;
  }

  return li;
}

function toggleExpand(id) {
  if (expanded.has(id)) expanded.delete(id);
  else expanded.add(id);
}

function findNode(id, node = tree) {
  if (node.id === id) return node;
  for (const child of node.children || []) {
    const found = findNode(id, child);
    if (found) return found;
  }
  return null;
}

function findApp(id, node = tree, parentApp = null) {
  const app = node.app || parentApp;
  if (node.id === id) return app;
  for (const child of node.children || []) {
    const found = findApp(id, child, app);
    if (found != null) return found;
  }
  return null;
}

function getAppOrigins() {
  try {
    const raw = localStorage.getItem(ORIGINS_KEY);
    if (raw) return { ...DEFAULT_APP_ORIGINS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_APP_ORIGINS };
}

/**
 * Converte path da árvore em path navegável (sem :params nem wildcards).
 * Ex.: /termos/:id/audit → /termos · /assinar/:token → /assinar · /app/* → null
 * Preserva #hash (ex.: /armazenamento#backup).
 */
function normalizeManualPath(path) {
  if (path == null || path === '') return null;
  const raw = String(path).trim();
  if (!raw || raw.includes('*')) return null;

  let hash = '';
  let pathname = raw;
  const hashIdx = raw.indexOf('#');
  if (hashIdx >= 0) {
    hash = raw.slice(hashIdx);
    pathname = raw.slice(0, hashIdx) || '/';
  }

  if (pathname === '/' || pathname === '') {
    return hash ? `/${hash}` : '/';
  }
  if (pathname.includes(':')) {
    const parts = pathname.split('/').filter(Boolean);
    const kept = [];
    for (const part of parts) {
      if (part.startsWith(':')) break;
      kept.push(part);
    }
    if (!kept.length) return null;
    pathname = `/${kept.join('/')}`;
  }
  return `${pathname}${hash}`;
}

/** URL absoluta da página do app para teste manual, ou null se não houver página. */
function manualPageUrl(app, path) {
  const p = normalizeManualPath(path);
  if (!app || !p) return null;
  const origins = getAppOrigins();
  const base = origins[app];
  if (!base) return null;
  const origin = String(base).replace(/\/$/, '');
  if (p === '/' || p.startsWith('/#')) {
    return `${origin}${p === '/' ? '/' : p}`;
  }
  return `${origin}${p}`;
}

function checkRowHtml(node, key, def) {
  const c = getCheck(node.id);
  const mapped = featureTests(node.id)[key];
  const testId = mapped?.id || '';
  const missing = mapped?.status === 'missing' || !mapped;
  const app = findApp(node.id);

  let actions = '';
  let manualUrl = null;
  if (key === 'e2e') {
    actions = `
      <button type="button" class="btn-play" data-run-e2e="${escapeHtml(testId)}"
        ${missing ? 'disabled title="Spec e2e não mapeado"' : 'title="Abrir Playwright UI"'}
        aria-label="Executar e2e">
        ${playIcon()}
      </button>`;
  } else if (key === 'api') {
    const hasReport = Boolean(apiReportExists[testId]);
    actions = `
      <div class="api-actions">
        ${
          hasReport
            ? `<button type="button" class="btn btn-sm" data-view-api="${escapeHtml(testId)}">Ver relatório</button>`
            : ''
        }
        <button type="button" class="btn-play" data-run-api="${escapeHtml(testId)}"
          ${missing ? 'disabled title="Suite API não mapeada"' : 'title="Rodar API/unit e gerar relatório"'}
          aria-label="Executar API/unit">
          ${playIcon()}
        </button>
      </div>`;
  } else if (key === 'manual') {
    manualUrl = manualPageUrl(app, node.path);
    if (manualUrl) {
      actions = `
        <button type="button" class="btn-play" data-open-manual="${escapeHtml(manualUrl)}"
          title="Abrir página: ${escapeHtml(manualUrl)}"
          aria-label="Abrir página para teste manual">
          ${playIcon()}
        </button>`;
    } else {
      actions = `
        <button type="button" class="btn-play" disabled
          title="Esta feature não tem página mapeada no app (path dinâmico ou ausente)"
          aria-label="Sem página para abrir">
          ${playIcon()}
        </button>`;
    }
  }

  const idHtml = testId
    ? `<code class="test-id" title="ID para agentes de IA">${escapeHtml(testId)}</code>`
    : manualUrl
      ? `<code class="test-id" title="URL do app">${escapeHtml(manualUrl)}</code>`
      : '<span class="hint">sem id</span>';

  return `
    <div class="check-row">
      <label class="check-main">
        <input type="checkbox" data-check="${key}" ${c[key] ? 'checked' : ''} />
        <span>
          <strong>${def.label}</strong>
          <span class="hint">${def.hint}</span>
          ${idHtml}
          ${missing && mapped?.note ? `<span class="hint warn">${escapeHtml(mapped.note)}</span>` : ''}
        </span>
      </label>
      ${actions}
    </div>`;
}

function renderDetail() {
  if (!selectedId) {
    elDetail.innerHTML = `<p class="muted">Selecione um nó na árvore para ver detalhes e marcar testes.</p>`;
    return;
  }
  const node = findNode(selectedId);
  if (!node) return;

  const app = findApp(selectedId);
  const status = aggregate(node);
  const leaf = isLeaf(node);

  const pills = [];
  if (app) pills.push(`<span class="pill">${app}</span>`);
  if (node.path) pills.push(`<span class="pill">${node.path}</span>`);
  pills.push(`<span class="pill">feature: ${node.id}</span>`);
  pills.push(`<span class="pill">${status.done}/${status.total} checks</span>`);

  let checksHtml = '';
  if (leaf) {
    checksHtml = `<div class="checks">${TEST_DEFS.map((t) => checkRowHtml(node, t.key, t)).join('')}</div>
    <div class="notes">
      <label for="notes">Notas</label>
      <textarea id="notes" placeholder="Ex.: validado em staging…">${getCheck(node.id).notes || ''}</textarea>
    </div>`;
  } else {
    checksHtml = `<p class="muted">Nó de agrupamento — marque os testes nas features (folhas). Progresso: <strong>${Math.round(status.ratio * 100)}%</strong>.</p>`;
  }

  elDetail.innerHTML = `
    <h2>${escapeHtml(node.label)}</h2>
    <p class="muted">${escapeHtml(node.description || 'Sem descrição.')}</p>
    <div class="detail-meta">${pills.join('')}</div>
    ${checksHtml}
  `;

  if (!leaf) return;

  elDetail.querySelectorAll('input[data-check]').forEach((input) => {
    input.addEventListener('change', () => {
      const key = input.getAttribute('data-check');
      checks[node.id] = { ...getCheck(node.id), [key]: input.checked };
      saveChecks();
      render();
    });
  });
  const notes = elDetail.querySelector('#notes');
  notes?.addEventListener('change', () => {
    checks[node.id] = { ...getCheck(node.id), notes: notes.value };
    saveChecks();
  });

  elDetail.querySelectorAll('[data-run-e2e]').forEach((btn) => {
    btn.addEventListener('click', () => runE2e(btn.getAttribute('data-run-e2e'), btn));
  });
  elDetail.querySelectorAll('[data-run-api]').forEach((btn) => {
    btn.addEventListener('click', () => runApi(btn.getAttribute('data-run-api'), btn));
  });
  elDetail.querySelectorAll('[data-view-api]').forEach((btn) => {
    btn.addEventListener('click', () => viewApiReport(btn.getAttribute('data-view-api')));
  });
  elDetail.querySelectorAll('[data-open-manual]').forEach((btn) => {
    btn.addEventListener('click', () => openManualPage(btn.getAttribute('data-open-manual')));
  });
}

function openManualPage(url) {
  if (!url) return;
  // Com "noopener", alguns browsers retornam null mesmo abrindo a aba — não alertar.
  window.open(url, '_blank', 'noopener,noreferrer');
}

async function runE2e(testId, btn) {
  if (!testId) return;
  btn.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/api/e2e/${encodeURIComponent(testId)}/run`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Falha ao iniciar e2e');
    alert(`${data.message}\n\nID: ${data.testId}\ncmd: ${data.command}`);
  } catch (err) {
    alert(err.message || 'Erro ao executar e2e');
  } finally {
    btn.disabled = false;
  }
}

async function runApi(testId, btn) {
  if (!testId) return;
  btn.disabled = true;
  const prev = btn.innerHTML;
  btn.innerHTML = '…';
  const statusEl = document.createElement('p');
  statusEl.className = 'muted run-status';
  statusEl.textContent = 'Executando suíte API/unit… (pode levar até ~90s; o relatório abre ao terminar)';
  elDetail.appendChild(statusEl);
  try {
    const res = await fetch(`${API_BASE}/api/api/${encodeURIComponent(testId)}/run`, { method: 'POST' });
    const data = await res.json();
    if (!data.report) throw new Error(data.error || 'Sem relatório');
    apiReportExists[testId] = true;
    if (data.report.ok && selectedId) {
      checks[selectedId] = { ...getCheck(selectedId), api: true };
      saveChecks();
    }
    showReport(data.report);
    renderDetail();
  } catch (err) {
    alert(err.message || 'Erro ao executar API/unit');
  } finally {
    btn.disabled = false;
    btn.innerHTML = prev;
    statusEl.remove();
  }
}

async function viewApiReport(testId) {
  try {
    const res = await fetch(`${API_BASE}/api/api/${encodeURIComponent(testId)}/report`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Relatório não encontrado');
    showReport(data.report);
  } catch (err) {
    alert(err.message);
  }
}

function showReport(report) {
  const cases = Array.isArray(report.cases) ? report.cases : [];
  const casesHtml = cases.length
    ? `<ol class="report-cases">${cases
        .map((c) => {
          const cls = c.status === 'pass' ? 'ok-text' : c.status === 'fail' ? 'err-text' : 'muted';
          const badge =
            c.status === 'pass' ? 'PASSOU' : c.status === 'fail' ? 'FALHOU' : String(c.status || '').toUpperCase();
          const ioList = Array.isArray(c.io) ? c.io : [];
          const ioHtml = ioList.length
            ? `<div class="report-io">
                <strong>Dados da chamada HTTP</strong>
                <p class="muted">${escapeHtml(c.ioSummaryPt || '')}</p>
                ${ioList
                  .map((io, idx) => {
                    const label = ioList.length > 1 ? `Chamada ${idx + 1}` : 'Chamada';
                    const setupNote = io.setup ? ' <span class="muted">(preparação/before)</span>' : '';
                    return `<div class="report-io-call">
                      <p><strong>${label}:</strong> <code>${escapeHtml(`${io.method || '?'} ${io.route || '?'}`)}</code>
                        ${io.status != null ? ` · <span class="${cls}">HTTP ${escapeHtml(String(io.status))}</span>` : ''}
                        ${io.setCookie ? ' · <span class="muted">Set-Cookie</span>' : ''}
                        ${setupNote}
                      </p>
                      <p class="muted">Payload enviado</p>
                      <pre class="log io-json">${escapeHtml(prettyJson(io.payload))}</pre>
                      <p class="muted">Resposta da API</p>
                      <pre class="log io-json">${escapeHtml(prettyJson(io.response))}</pre>
                      ${io.error ? `<p class="err-text">${escapeHtml(io.error)}</p>` : ''}
                    </div>`;
                  })
                  .join('')}
              </div>`
            : `<div class="report-io">
                <strong>Dados da chamada HTTP</strong>
                <p class="muted">${escapeHtml(c.ioSummaryPt || 'Sem captura HTTP neste caso.')}</p>
              </div>`;

          return `<li class="report-case">
            <div class="report-case-head">
              <span class="${cls}"><strong>${badge}</strong></span>
              <code>${escapeHtml(c.title || '')}</code>
              ${c.durationMs != null ? `<span class="muted">${Number(c.durationMs).toFixed(0)}ms</span>` : ''}
            </div>
            <p class="report-case-desc"><strong>O que este teste faz:</strong> ${escapeHtml(c.descriptionPt || '')}</p>
            <p class="report-case-result ${cls}"><strong>Resultado:</strong> ${escapeHtml(c.resultPt || '')}</p>
            ${ioHtml}
          </li>`;
        })
        .join('')}</ol>`
    : '<p class="muted">Nenhum caso individual foi identificado na saída do runner.</p>';

  elModalBody.innerHTML = `
    <p class="report-summary">${escapeHtml(report.summary?.summaryPt || report.descriptionPt || '')}</p>
    <p>
      <strong>Resultado geral:</strong>
      <span class="${report.ok ? 'ok-text' : 'err-text'}">${report.ok ? 'SUCESSO' : 'FALHA'}</span>
      · <code>${escapeHtml(report.testId || '')}</code>
      ${report.timedOut ? ' · <span class="err-text">tempo esgotado</span>' : ''}
    </p>
    <p class="muted">${escapeHtml(report.descriptionPt || '')}</p>
    <p class="muted">
      Casos: ${report.summary?.pass ?? 0} ok /
      ${report.summary?.fail ?? 0} falha /
      ${report.summary?.skipped ?? 0} ignorados
      ${report.summary?.durationMs ? ` · ${Math.round(report.summary.durationMs)}ms` : ''}
    </p>
    <h3>Casos</h3>
    ${casesHtml}
    <details class="report-raw">
      <summary>Log técnico (stdout/stderr)</summary>
      <p><code class="cmd">${escapeHtml(report.command || '')}</code></p>
      <h4>stdout</h4>
      <pre class="log">${escapeHtml(stripIoNoise(report.stdout) || '(vazio)')}</pre>
      <h4>stderr</h4>
      <pre class="log">${escapeHtml(report.stderr || '(vazio)')}</pre>
    </details>
  `;
  elModal.classList.remove('hidden');
  elModal.setAttribute('aria-hidden', 'false');
}

function prettyJson(value) {
  if (value === undefined) return '(nenhum)';
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function stripIoNoise(stdout) {
  return String(stdout || '')
    .split(/\r?\n/)
    .filter((l) => !l.startsWith('__KUNK_IO__'))
    .join('\n');
}

function hideModal() {
  elModal.classList.add('hidden');
  elModal.setAttribute('aria-hidden', 'true');
}

function yesNo(v) {
  return v ? 'sim' : 'não';
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function render() {
  renderStats();
  renderTree();
  renderDetail();
}

function expandAll() {
  walk(tree, (n) => {
    if (!isLeaf(n)) expanded.add(n.id);
  });
  render();
}

function collapseAll() {
  expanded = new Set([tree.id]);
  render();
}

function exportChecks() {
  const blob = new Blob([JSON.stringify(checks, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'checks.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importChecks(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result || '{}'));
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('JSON inválido');
      checks = data;
      saveChecks();
      render();
    } catch (err) {
      alert(err.message || 'Falha ao importar');
    }
  };
  reader.readAsText(file);
}

document.getElementById('btn-expand').addEventListener('click', expandAll);
document.getElementById('btn-collapse').addEventListener('click', collapseAll);
document.getElementById('btn-export').addEventListener('click', exportChecks);
document.getElementById('btn-reset').addEventListener('click', () => {
  if (!confirm('Limpar todos os checks salvos neste navegador?')) return;
  checks = {};
  saveChecks();
  render();
});
document.getElementById('input-import').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (file) importChecks(file);
});
document.getElementById('filter-pending').addEventListener('change', (e) => {
  filterPending = e.target.checked;
  render();
});
document.getElementById('filter-app').addEventListener('change', (e) => {
  filterApp = e.target.value;
  render();
});
document.getElementById('report-modal-close').addEventListener('click', hideModal);
elModal.addEventListener('click', (e) => {
  if (e.target === elModal) hideModal();
});

async function boot() {
  try {
    const [treeRes, regRes, resultsRes] = await Promise.all([
      fetch(`${API_BASE}/data/tree.json`),
      fetch(`${API_BASE}/api/registry`),
      fetch(`${API_BASE}/api/results`).catch(() => null),
    ]);
    if (!treeRes.ok) throw new Error('Falha ao carregar tree.json — use: node server.mjs');
    tree = await treeRes.json();
    if (regRes.ok) registry = await regRes.json();
    if (resultsRes?.ok) {
      const list = await resultsRes.json();
      for (const r of list) apiReportExists[r.testId] = true;
    }
    render();
  } catch (err) {
    elTree.innerHTML = `<p class="muted" style="padding:1rem">${escapeHtml(err.message)}</p>`;
  }
}

boot();
