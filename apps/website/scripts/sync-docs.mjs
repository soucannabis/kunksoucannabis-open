#!/usr/bin/env node
/**
 * Copia project-tools/docs → src/content/docs (api, frontend, funcionalidades)
 * para o site público. Não publica material de Directus / migração / projeto anterior.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEBSITE_ROOT = path.resolve(__dirname, "..");
const REPO_ROOT = path.resolve(WEBSITE_ROOT, "../..");
const SRC = path.join(REPO_ROOT, "project-tools/docs");
const DEST = path.join(WEBSITE_ROOT, "src/content/docs");

const SYNC_DIRS = ["api", "frontend", "funcionalidades"];

/** Paths relativos a project-tools/docs que não entram no site. */
const SKIP_REL = new Set([
  "api/migration-from-directus.md",
  "frontend/kunk/removed-from-v1.md",
  "frontend/file-rename-pt-to-en.md",
]);

function yamlEscape(value) {
  const s = String(value).replace(/\s+/g, " ").trim();
  if (/[:#{}[\],&*?|>!%@`]/.test(s) || s.includes('"') || s.includes("'")) {
    return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return s;
}

function rewriteLinks(body) {
  return body
    .replace(/\]\(([^)]*?)README\.md(#[^)]*)?\)/g, "]($1$2)")
    .replace(/\]\(([^)]+?)\.md(#[^)]*)?\)/g, "]($1$2)");
}

/** Nunca exibir nomes/links de arquivos .md no site público. */
function scrubMdMentions(body) {
  let text = body;

  // [arquivo.md](url) → [arquivo](url)
  text = text.replace(/\[([^\]]+?)\.md(#[^\]]*)?\]\(([^)]+)\)/gi, "[$1$2]($3)");

  // `arquivo.md` → `arquivo`
  text = text.replace(/`([^`\n]+?)\.md`/gi, "`$1`");

  // Menções soltas a *.md (inclui paths tipo docs/foo.md)
  text = text.replace(/\b([A-Za-z0-9_./-]+)\.md\b/gi, "$1");

  // Links cujo href ainda termina em .md (externos etc.) — remove a extensão do href
  text = text.replace(/\]\(([^)\s]+?)\.md(#[^)]*)?\)/gi, "]($1$2)");

  return text;
}

/** Remove colunas de tabela markdown pelo nome do cabeçalho. */
function removeTableColumns(text, columnNames) {
  const names = new Set(columnNames.map((n) => n.toLowerCase()));
  const lines = text.split("\n");
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/^\|.+\|$/.test(line.trim())) {
      out.push(line);
      continue;
    }

    const cells = line.split("|").slice(1, -1);
    const isSep = cells.every((c) => /^[\s:-]+$/.test(c));
    const headerIdx = [];

    // Look ahead/back for header row of this table block
    let headerLine = null;
    if (!isSep) {
      // If next line is separator, this is header
      const next = lines[i + 1] || "";
      if (/^\|[\s|:-]+\|$/.test(next.trim())) headerLine = line;
    }

    if (headerLine) {
      const headers = cells.map((c) => c.replace(/[*`]/g, "").trim().toLowerCase());
      const drop = headers
        .map((h, idx) => (names.has(h) ? idx : -1))
        .filter((idx) => idx >= 0);
      if (drop.length) {
        // store drop indexes on separator processing via closure on out marker
        const keep = cells
          .map((c, idx) => (drop.includes(idx) ? null : c))
          .filter((c) => c !== null);
        out.push(`|${keep.join("|")}|`);
        // mark for following rows until blank/non-table
        let j = i + 1;
        while (j < lines.length && /^\|.+\|$/.test(lines[j].trim())) {
          const rowCells = lines[j].split("|").slice(1, -1);
          const kept = rowCells
            .map((c, idx) => (drop.includes(idx) ? null : c))
            .filter((c) => c !== null);
          out.push(`|${kept.join("|")}|`);
          j++;
        }
        i = j - 1;
        continue;
      }
    }

    out.push(line);
  }

  return out.join("\n");
}

/** Remove referências ao stack/projeto anterior (Directus, DocuSeal, kunkserver, etc.). */
function scrubLegacy(body) {
  let text = body;

  // Seções inteiras cujo título cita ferramentas/legado antigo / fonte legada
  text = text.replace(
    /^#{2,6}[^\n]*\b(Directus|DocuSeal|kunkserver|legado|v1|Fonte legada)\b[^\n]*\n(?:.*\n)*?(?=^#{2,6} |\Z)/gim,
    ""
  );

  // Blockquotes centradas nessas ferramentas
  text = text.replace(/^>.*\b(Directus|DocuSeal|kunkserver)\b.*\n?/gim, "");
  text = text.replace(/^>.*superfícies de UI.*\n?/gim, "");

  // Frases e trechos inline — remove sem deixar rastro do stack antigo
  text = text.replace(/\s*\(estilo Directus\)/gi, "");
  text = text.replace(/\s*\(substitui DocuSeal\)/gi, "");
  text = text.replace(/\s*—?\s*substitui(?:r)? o Directus[^.]*\.?/gi, "");
  text = text.replace(/\s*—?\s*substitui(?:r)? o DocuSeal[^.]*\.?/gi, "");
  text = text.replace(/Substitui o Directus[^.]*\.?/gi, "");
  text = text.replace(/Substitui o DocuSeal[^.]*\.?/gi, "");
  text = text.replace(/sem depender de Directus nem DocuSeal,?/gi, "");
  text = text.replace(/Directus legado/gi, "");
  text = text.replace(/Migração de dados Directus legado/gi, "Migração de dados");
  text = text.replace(/layout igual ao legado(\s*\([^)]*\))?/gi, "");
  text = text.replace(/\bkunkserver\/?/gi, "");
  text = text.replace(/\bDocuSeal\b/gi, "");
  text = text.replace(/\bDirectus\b/gi, "");
  text = text.replace(/`directusRequest`/gi, "cliente HTTP");
  text = text.replace(/\(legado\)/gi, "");
  text = text.replace(/\bdo legado\b/gi, "");
  text = text.replace(/\blegado\b/gi, "");
  text = text.replace(/^.*migration-from-[^\n]*\n?/gim, "");
  text = text.replace(/Aliases de transição \(deprecados\):[^\n]*/gi, "");
  text = text.replace(/^.*file-rename-pt-to-en.*\n?/gim, "");
  text = text.replace(/^.*apps\/website.*\n?/gim, "");
  text = text.replace(/`apps\/website\/?[^`]*`/gi, "");
  text = text.replace(/@kunk\/website/gi, "");

  // Superfícies / subdomínios dos apps — não publicar no site
  text = text.replace(/\s*\((?:cad|admin|app|termos)\)/gi, "");
  text = text.replace(/`(?:cad|admin|app|termos)\/`/gi, "");
  text = text.replace(/`(?:cad|admin|app|termos)\.`/gi, "");
  text = text.replace(/\|\s*`?(?:cad|admin|app|termos)\/`?\s*\|/gi, "|");
  text = text.replace(/\|\s*`?(?:cad|admin|app|termos)\.`?\s*\|/gi, "|");
  text = removeTableColumns(text, ["Subdomínio", "Superfície"]);
  text = text.replace(/superfícies distintas por subdomínio/gi, "apps distintos por papel");
  text = text.replace(/Documentação das superfícies de UI/gi, "Documentação dos apps");
  text = text.replace(/é a superfície de/gi, "é o app de");
  text = text.replace(/por superfície/gi, "por app");
  text = text.replace(/Quatro superfícies/gi, "Quatro apps");
  text = text.replace(/superfícies claras/gi, "apps claros");
  text = text.replace(/^##\s*Superfícies por papel\s*$/gim, "## Apps por papel");

  text = text.replace(/  +/g, " ");
  text = text.replace(/\(\s*\)/g, "");
  text = text.replace(/\[\s*\]\([^)]*\)/g, "");
  text = text.replace(/[ \t]+\n/g, "\n");

  // Links órfãos para páginas removidas
  text = text.replace(
    /\[[^\]]*\]\([^)]*(?:\/directus|migration-from-directus|removed-from-v1|file-rename-pt-to-en)[^)]*\)/gi,
    ""
  );

  text = text.replace(/^\|(?:\s*\|)+\s*$/gm, "");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim() + "\n";
}

function toStarlightMarkdown(raw, fallbackTitle) {
  let body = raw.replace(/^\uFEFF/, "");
  let existingFm = null;

  if (body.startsWith("---")) {
    const end = body.indexOf("\n---", 3);
    if (end !== -1) {
      existingFm = body.slice(3, end).trim();
      body = body.slice(end + 4).replace(/^\n+/, "");
    }
  }

  let title = fallbackTitle;
  const h1 = body.match(/^#\s+(.+)$/m);
  if (h1) {
    title = h1[1].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_`]/g, "").trim();
    body = body.replace(/^#\s+.+$/m, "").replace(/^\n+/, "");
  }

  // Não publicar páginas cujo título é sobre o stack antigo
  if (/\b(Directus|DocuSeal|kunkserver)\b/i.test(title)) {
    return null;
  }

  body = rewriteLinks(body);
  body = scrubLegacy(body);
  body = scrubMdMentions(body);
  if (!body.trim()) return null;

  const hasTitle = existingFm && /^title:\s*/m.test(existingFm);
  const fm = hasTitle
    ? existingFm
    : [`title: ${yamlEscape(title)}`, existingFm].filter(Boolean).join("\n");

  return `---\n${fm}\n---\n\n${body.trim()}\n`;
}

function walkMarkdown(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkMarkdown(full, files);
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(full);
  }
  return files;
}

function clearSyncedDirs() {
  for (const dir of [...SYNC_DIRS, "directus"]) {
    fs.rmSync(path.join(DEST, dir), { recursive: true, force: true });
  }
}

function sync() {
  if (!fs.existsSync(SRC)) {
    console.error(`Fonte não encontrada: ${SRC}`);
    process.exit(1);
  }

  fs.mkdirSync(DEST, { recursive: true });
  clearSyncedDirs();

  let count = 0;
  let skipped = 0;
  for (const dir of SYNC_DIRS) {
    const fromRoot = path.join(SRC, dir);
    for (const file of walkMarkdown(fromRoot)) {
      const rel = path.relative(SRC, file).split(path.sep).join("/");
      if (SKIP_REL.has(rel)) {
        skipped += 1;
        continue;
      }

      let outRel = rel;
      if (path.basename(rel) === "README.md") {
        outRel = path.join(path.dirname(rel), "index.md");
      }
      const outPath = path.join(DEST, outRel);

      const fallback =
        path.basename(rel, ".md") === "README"
          ? path.basename(path.dirname(rel))
          : path.basename(rel, ".md");
      const raw = fs.readFileSync(file, "utf8");
      const rendered = toStarlightMarkdown(raw, fallback);
      if (!rendered) {
        skipped += 1;
        continue;
      }
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, rendered, "utf8");
      count += 1;
    }
  }

  console.log(
    `sync-docs: ${count} páginas → ${path.relative(REPO_ROOT, DEST)} (omitidas: ${skipped})`
  );
}

sync();
