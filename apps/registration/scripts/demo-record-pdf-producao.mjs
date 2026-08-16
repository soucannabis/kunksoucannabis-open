/**
 * Demo curta: só a visualização de um PDF de relatório de produção já gerado.
 * Não faz login nem entra no sistema.
 *
 * Usa o PDF mais recente em ~/Downloads/itens_producao_*.pdf
 * (ou DEMO_PDF_PATH apontando para um arquivo).
 *
 * Tempos:
 * - 5s na tabela "Itens para Produção"
 * - 7s na tabela "Registro de dispensação"
 * - scroll para baixo
 * - 10s no final e encerra
 *
 * Uso:
 *   npm run demo:pdf-producao
 *   DEMO_PDF_PATH=/caminho/arquivo.pdf npm run demo:pdf-producao
 */
import { copyFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  demoCommonEnv,
  demoKindOutDir,
  fmtSec,
  log,
  openDemoBrowser,
  pause,
} from './demo-lib.mjs';

function resolveLatestProductionPdf() {
  const override = String(process.env.DEMO_PDF_PATH || '').trim();
  if (override) {
    if (!existsSync(override)) {
      throw new Error(`DEMO_PDF_PATH não encontrado: ${override}`);
    }
    return override;
  }

  const downloads = join(homedir(), 'Downloads');
  const files = readdirSync(downloads)
    .filter((name) => /^itens_producao_.*\.pdf$/i.test(name))
    .map((name) => {
      const path = join(downloads, name);
      return { path, mtime: statSync(path).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  if (!files.length) {
    throw new Error(
      `Nenhum PDF itens_producao_*.pdf em ${downloads}. Passe DEMO_PDF_PATH=.`
    );
  }
  return files[0].path;
}

async function viewProductionPdf(page) {
  const itemsHoldMs = Number(process.env.DEMO_PDF_ITEMS_MS || 5_000);
  const dispensationHoldMs = Number(process.env.DEMO_PDF_DISPENSATION_MS || 7_000);
  const finalHoldMs = Number(process.env.DEMO_HOLD_MS || 10_000);
  const scrollSteps = Number(process.env.DEMO_PDF_SCROLL_STEPS || 8);
  const scrollStepMs = Number(process.env.DEMO_PDF_SCROLL_STEP_MS || 900);

  const vx = Math.round(page.viewportSize()?.width / 2 || 640);
  const vy = Math.round(page.viewportSize()?.height / 2 || 400);

  await pause(page, 1000, 'PDF carregando');
  await page.mouse.click(vx, vy);
  await pause(page, 400, 'foco no PDF');

  log('pdf', `Itens para Produção — hold ${fmtSec(itemsHoldMs)}`);
  await pause(page, itemsHoldMs, 'tabela Itens para Produção');

  await page.keyboard.press('PageDown');
  await pause(page, 600, 'ir para dispensação');

  log('pdf', `Registro de dispensação — hold ${fmtSec(dispensationHoldMs)}`);
  await pause(page, dispensationHoldMs, 'tabela Registro de dispensação');

  log('scroll', `PDF — rolar (${scrollSteps} passos)`);
  for (let i = 0; i < scrollSteps; i++) {
    await page.keyboard.press('PageDown');
    await pause(page, scrollStepMs, `PDF passo ${i + 1}/${scrollSteps}`);
  }

  log('finish', `hold final ${fmtSec(finalHoldMs)}`);
  await pause(page, finalHoldMs, 'hold final no PDF');
}

async function main() {
  const cfg = demoCommonEnv();
  const outDir = demoKindOutDir('pdf-producao', cfg.outDir);
  const sourcePdf = resolveLatestProductionPdf();
  const localPdf = join(outDir, basename(sourcePdf));
  copyFileSync(sourcePdf, localPdf);
  const fileUrl = pathToFileURL(localPdf).href;

  log('start', '════════════ visualização PDF produção ════════════');
  log('start', `pdf=${sourcePdf}`);
  log('start', `fileUrl=${fileUrl} | outDir=${outDir}`);

  const { page, closeAndSave } = await openDemoBrowser({
    mobile: cfg.mobile,
    channel: cfg.channel,
    slowMo: 0,
    outDir,
    label: 'pdf-producao',
  });

  try {
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await viewProductionPdf(page);
  } finally {
    log('browser', 'fechando e salvando vídeo…');
    await closeAndSave();
  }
}

main().catch((err) => {
  console.error('\nFALHA:', err?.message || err);
  process.exit(1);
});
