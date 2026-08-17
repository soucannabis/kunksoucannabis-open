/**
 * Renderiza as capas HTML em PNG 1920x1080 ou inicia o preview local.
 *
 * Uso:
 *   npm run covers:render
 *   npm run covers:render -- api-kunk dashboard
 *   npm run covers:preview
 */
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(scriptsDir, '..');
const coversDir = join(appDir, 'demos', 'covers');
const outputDir = join(coversDir, 'generated');
const host = '127.0.0.1';

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function safePath(urlPath) {
  const raw = decodeURIComponent(String(urlPath || '/').split('?')[0]);
  const relative = raw === '/' ? 'cover-layout.html' : raw.replace(/^\/+/, '');
  const normalized = normalize(relative);
  const absolute = resolve(coversDir, normalized);
  if (!absolute.startsWith(`${coversDir}/`) && absolute !== coversDir) return null;
  return absolute;
}

function createStaticServer() {
  return createServer(async (request, response) => {
    try {
      const file = safePath(request.url);
      if (!file) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const body = await readFile(file);
      response.writeHead(200, {
        'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      response.end(body);
    } catch (error) {
      response.writeHead(error?.code === 'ENOENT' ? 404 : 500).end(error.message);
    }
  });
}

async function listen(server) {
  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, host, resolveListen);
  });
  const address = server.address();
  return `http://${host}:${address.port}`;
}

async function loadCatalog() {
  const raw = await readFile(join(coversDir, 'covers.json'), 'utf8');
  return JSON.parse(raw);
}

async function render(baseUrl, ids) {
  const catalog = await loadCatalog();
  const known = new Set(catalog.covers.map(({ id }) => id));
  const selected = ids.length ? ids : [...known];
  const unknown = selected.filter((id) => !known.has(id));
  if (unknown.length) throw new Error(`Capas desconhecidas: ${unknown.join(', ')}`);

  await mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });

  try {
    for (const id of selected) {
      const url = `${baseUrl}/cover-layout.html?id=${encodeURIComponent(id)}`;
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.__COVER_READY__ || window.__COVER_ERROR__);
      const error = await page.evaluate(() => window.__COVER_ERROR__ || '');
      if (error) throw new Error(`${id}: ${error}`);

      const output = join(outputDir, `capa-${id}-1920x1080.png`);
      await page.locator('#cover').screenshot({ path: output });
      console.log(`✓ ${id}: ${output}`);
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const preview = args.includes('--preview');
  const ids = args.filter((arg) => !arg.startsWith('--'));
  const server = createStaticServer();
  const baseUrl = await listen(server);

  if (preview) {
    const catalog = await loadCatalog();
    console.log(`Preview: ${baseUrl}/cover-layout.html?id=${catalog.covers[0]?.id || 'api-kunk'}`);
    console.log(`IDs: ${catalog.covers.map(({ id }) => id).join(', ')}`);
    return;
  }

  try {
    await render(baseUrl, ids);
  } finally {
    await new Promise((resolveClose) => server.close(resolveClose));
  }
}

main().catch((error) => {
  console.error(`Falha ao gerar capas: ${error.stack || error.message}`);
  process.exitCode = 1;
});
