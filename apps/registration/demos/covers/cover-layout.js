const ICONS = new Set([
  'api', 'box', 'calendar', 'card', 'chart', 'checklist', 'dashboard',
  'database', 'document', 'envelope', 'eye', 'filter', 'gear', 'headset',
  'heart', 'history', 'list', 'lock', 'plug', 'search', 'target', 'truck',
  'user', 'users', 'hero-registration', 'hero-triage', 'hero-orders',
  'hero-care', 'hero-associates', 'hero-dashboard', 'hero-report', 'hero-api',
]);

function svgIcon(name, className = '') {
  const icon = ICONS.has(name) ? name : 'checklist';
  return `<svg class="${className}" viewBox="0 0 64 64" aria-hidden="true"><use href="#i-${icon}"/></svg>`;
}

function renderItems(container, items = []) {
  container.innerHTML = items
    .map(
      ({ icon, text }) => `
        <div class="feature">
          <span class="feature__icon">${svgIcon(icon)}</span>
          <span class="feature__text">${text}</span>
        </div>
      `
    )
    .join('');
}

function queryId() {
  return new URLSearchParams(window.location.search).get('id') || 'api-kunk';
}

async function loadData() {
  const response = await fetch('./covers.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Falha ao carregar covers.json (${response.status})`);
  return response.json();
}

/** Reduz o título até caber na largura, mantendo o mesmo bloco de alinhamento. */
function fitTitle(el, { max = 96, min = 48 } = {}) {
  let size = max;
  el.style.setProperty('--title-size', `${size}px`);
  // Força layout antes de medir
  void el.offsetWidth;
  while (size > min && el.scrollWidth > el.clientWidth + 1) {
    size -= 2;
    el.style.setProperty('--title-size', `${size}px`);
  }
  return size;
}

function preloadBackground(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = url;
  });
}

async function main() {
  const catalog = await loadData();
  const id = queryId();
  const data = catalog.covers.find((cover) => cover.id === id);
  if (!data) throw new Error(`Capa "${id}" não encontrada`);

  const cover = document.querySelector('#cover');
  cover.classList.add(`theme-${data.theme || 'forest'}`);
  cover.dataset.coverId = id;
  if (data.backgroundImage) {
    cover.classList.add('cover--has-bg');
    cover.style.setProperty('--background-image', `url("${data.backgroundImage}")`);
    await preloadBackground(data.backgroundImage);
  }

  document.title = `${data.title} — Kunk`;
  document.querySelector('#eyebrow').textContent = data.eyebrow || '';
  const titleEl = document.querySelector('#title');
  titleEl.textContent = data.title;
  fitTitle(titleEl, { max: data.titleSize || 96, min: 48 });
  document.querySelector('#left-title').textContent = data.left?.title || 'O QUE O MÓDULO FAZ';
  document.querySelector('#right-title').textContent = data.right?.title || 'PARA A ASSOCIAÇÃO';
  document.querySelector('#hero-icon').innerHTML = svgIcon(data.heroIcon || 'dashboard');
  document.querySelector('#footer').textContent = data.footer || '';
  renderItems(document.querySelector('#left-items'), data.left?.items);
  renderItems(document.querySelector('#right-items'), data.right?.items);

  document.documentElement.dataset.ready = 'true';
  window.__COVER_READY__ = true;
}

main().catch((error) => {
  document.body.innerHTML = `<pre style="padding:2rem;color:#fff">${error.stack || error.message}</pre>`;
  window.__COVER_ERROR__ = error.message;
});
