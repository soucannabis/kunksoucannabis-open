#!/usr/bin/env node
/**
 * Servidor do protótipo de roadmap:
 * - estáticos
 * - POST /api/e2e/:testId/run  → Playwright UI
 * - POST /api/api/:testId/run   → node --test / vitest + relatório PT-BR
 * - GET  /api/api/:testId/report
 * - GET  /api/registry
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildPortugueseReport } from './lib/reportPt.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PORT = Number(process.env.ROADMAP_PORT || 4178);
const RESULTS_DIR = path.join(__dirname, 'data', 'results');
const API_TIMEOUT_MS = Number(process.env.ROADMAP_API_TIMEOUT_MS || 90_000);

fs.mkdirSync(RESULTS_DIR, { recursive: true });

const registry = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'test-registry.json'), 'utf8'),
);

function findByTestId(kind, testId) {
  for (const [featureId, entry] of Object.entries(registry.features || {})) {
    const block = entry[kind];
    if (block?.id === testId) return { featureId, ...block };
  }
  return null;
}

function send(res, status, body, type = 'application/json') {
  let data;
  let contentTypeHeader = `${type}; charset=utf-8`;
  if (Buffer.isBuffer(body)) {
    data = body;
    contentTypeHeader =
      type.startsWith('text/') ||
      type.includes('json') ||
      type.includes('javascript') ||
      type.includes('html')
        ? `${type}; charset=utf-8`
        : type;
  } else if (typeof body === 'string') {
    data = body;
  } else {
    data = JSON.stringify(body, null, 2);
  }
  res.writeHead(status, {
    'Content-Type': contentTypeHeader,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(data);
}

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html';
  if (filePath.endsWith('.css')) return 'text/css';
  if (filePath.endsWith('.js')) return 'text/javascript';
  if (filePath.endsWith('.json')) return 'application/json';
  return 'application/octet-stream';
}

function safeJoin(base, reqPath) {
  const cleaned = path.normalize(decodeURIComponent(reqPath)).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(base, cleaned);
  if (!full.startsWith(base)) return null;
  return full;
}

function runE2eUi(entry) {
  const cwd = path.join(ROOT, entry.cwd);
  const args = ['playwright', 'test', '--ui', ...(entry.config ? [`--config=${entry.config}`] : [])];
  if (entry.spec) args.push(entry.spec);
  if (entry.grep) args.push('-g', entry.grep);

  const child = spawn('npx', args, {
    cwd,
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, FORCE_COLOR: '1' },
  });
  child.unref();
  return {
    ok: true,
    mode: 'playwright-ui',
    testId: entry.id,
    featureId: entry.featureId,
    pid: child.pid,
    cwd: entry.cwd,
    command: `npx ${args.join(' ')}`,
    message: 'Playwright UI iniciado. Veja a janela do Playwright no desktop.',
  };
}

function runApiUnit(entry) {
  return new Promise((resolve) => {
    const cwd = path.join(ROOT, entry.cwd);
    const startedAt = new Date().toISOString();
    const files = entry.files || [];
    const isVitest = entry.runner === 'vitest';
    const bin = isVitest ? 'npx' : process.execPath;
    const captureIo =
      !isVitest && entry.cwd === 'kunk-api'
        ? ['-r', path.join(ROOT, 'kunk-api/tests/helpers/captureHttpIo.js')]
        : [];
    const spawnArgs = isVitest
      ? ['vitest', 'run', '--reporter=verbose', ...files]
      : [...captureIo, '--test', '--test-concurrency=1', '--test-reporter=spec', ...files];
    const command = `${bin} ${spawnArgs.join(' ')}`;

    const child = spawn(bin, spawnArgs, {
      cwd,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        FORCE_COLOR: '0',
        CI: '1',
        KUNK_TEST_CAPTURE_IO: !isVitest && entry.cwd === 'kunk-api' ? '1' : '0',
      },
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;

    const finish = (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const finishedAt = new Date().toISOString();
      const report = buildPortugueseReport({
        entry: { ...entry, _command: command },
        exitCode: code == null ? -1 : code,
        stdout,
        stderr,
        timedOut,
        startedAt,
        finishedAt,
      });
      const outPath = path.join(RESULTS_DIR, `${entry.id.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`);
      fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
      resolve({ ok: true, report, storedAt: outPath });
    };

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGTERM');
      } catch {
        /* ignore */
      }
      setTimeout(() => {
        try {
          child.kill('SIGKILL');
        } catch {
          /* ignore */
        }
      }, 2000);
    }, API_TIMEOUT_MS);

    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('close', (code) => finish(code));
    child.on('error', (err) => {
      stderr += `\n${err.message}`;
      finish(-1);
    });
  });
}

function readReport(testId) {
  const file = path.join(RESULTS_DIR, `${testId.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    send(res, 204, '');
    return;
  }

  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/api/registry') {
    send(res, 200, registry);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    send(res, 200, { ok: true, root: ROOT, apiTimeoutMs: API_TIMEOUT_MS });
    return;
  }

  const e2eRun = url.pathname.match(/^\/api\/e2e\/([^/]+)\/run$/);
  if (req.method === 'POST' && e2eRun) {
    const testId = decodeURIComponent(e2eRun[1]);
    const entry = findByTestId('e2e', testId);
    if (!entry) {
      send(res, 404, { ok: false, error: `e2e testId não encontrado: ${testId}` });
      return;
    }
    if (entry.status === 'missing') {
      send(res, 400, { ok: false, error: entry.note || 'Spec e2e ainda não criado' });
      return;
    }
    try {
      send(res, 200, runE2eUi(entry));
    } catch (err) {
      send(res, 500, { ok: false, error: err.message });
    }
    return;
  }

  const apiRun = url.pathname.match(/^\/api\/api\/([^/]+)\/run$/);
  if (req.method === 'POST' && apiRun) {
    const testId = decodeURIComponent(apiRun[1]);
    const entry = findByTestId('api', testId);
    if (!entry) {
      send(res, 404, { ok: false, error: `api testId não encontrado: ${testId}` });
      return;
    }
    if (entry.status === 'missing') {
      send(res, 400, { ok: false, error: entry.note || 'Suite API/unit ainda não mapeada' });
      return;
    }
    try {
      const result = await runApiUnit(entry);
      send(res, 200, result);
    } catch (err) {
      send(res, 500, { ok: false, error: err.message || 'Falha ao executar suíte' });
    }
    return;
  }

  const apiReport = url.pathname.match(/^\/api\/api\/([^/]+)\/report$/);
  if (req.method === 'GET' && apiReport) {
    const testId = decodeURIComponent(apiReport[1]);
    const report = readReport(testId);
    if (!report) {
      send(res, 404, { ok: false, error: 'Nenhum relatório salvo ainda' });
      return;
    }
    send(res, 200, { ok: true, report });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/results') {
    const files = fs.readdirSync(RESULTS_DIR).filter((f) => f.endsWith('.json'));
    send(
      res,
      200,
      files.map((f) => {
        const r = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, f), 'utf8'));
        return {
          testId: r.testId,
          featureId: r.featureId,
          ok: r.ok,
          finishedAt: r.finishedAt,
          summaryPt: r.summary?.summaryPt || null,
          file: f,
        };
      }),
    );
    return;
  }

  let reqPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = safeJoin(__dirname, reqPath);
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    send(res, 404, { error: 'Not found' });
    return;
  }
  send(res, 200, fs.readFileSync(filePath), contentType(filePath));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Roadmap em http://127.0.0.1:${PORT}`);
  console.log(`Repo root: ${ROOT}`);
  console.log(`Timeout API/unit: ${API_TIMEOUT_MS}ms`);
});
