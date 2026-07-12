#!/usr/bin/env node
/**
 * Cruza campos do schema Directus (escopo OSS) com o código em
 * src/, kunkserver/, cadastramento/ e classifica uso.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const SCHEMA = path.join(__dirname, "../exports/directus/schema.json");
const SCAN_DIRS = ["src", "kunkserver", "cadastramento"].map((d) =>
  path.join(ROOT, d)
);
const IGNORE_DIRS = new Set([
  "node_modules",
  "dist",
  "dist-ssr",
  ".git",
  "exports",
  "project-tools",
]);

const GENERIC_FIELDS = new Set([
  "id",
  "sort",
  "status",
  "type",
  "name",
  "code",
  "email",
  "phone",
  "city",
  "state",
  "tags",
  "info",
  "message",
  "at",
  "log",
  "number",
  "action",
  "date",
  "total",
  "price",
  "items",
  "details",
  "partner",
  "products",
  "services",
  "reports",
  "queries",
  "positions",
  "documents",
  "validation",
  "batch",
  "amount",
  "category",
  "color",
  "token",
  "pass",
  "cpf",
  "rg",
  "cep",
  "street",
  "neighborhood",
  "complement",
  "gender",
  "nationality",
  "discount",
  "carrier",
  "address",
  "contract",
  "prescriber",
  "institution",
  "professional",
  "associate",
  "observations",
  "fingerprint",
  "transactions",
  "permissions",
  "associates",
  "created_by",
  "created_date",
  "date_created",
  "date_updated",
]);

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(p, out);
    else if (/\.(js|jsx|ts|tsx|mjs|cjs|json|md)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function loadCodebase() {
  const files = [];
  for (const d of SCAN_DIRS) walkFiles(d, files);
  const contents = new Map();
  for (const f of files) {
    if (f.includes("project-tools/exports")) continue;
    contents.set(f, fs.readFileSync(f, "utf8"));
  }
  return contents;
}

function countPatterns(text, patterns) {
  let n = 0;
  for (const re of patterns) {
    const m = text.match(re);
    if (m) n += m.length;
  }
  return n;
}

function analyzeField(collection, field, files) {
  const patterns = [
    new RegExp(`["']${field}["']`, "g"),
    new RegExp(`\\.${field}\\b`, "g"),
    new RegExp(`\\[['"]${field}['"]\\]`, "g"),
    new RegExp(`filter\\[${field}\\]`, "g"),
    new RegExp(`filter\\[${field}[_\\[]`, "g"),
    new RegExp(`${field}\\s*:`, "g"),
  ];

  const collectionPatterns = [
    new RegExp(`items/${collection}[^\\n]*${field}`, "gi"),
    new RegExp(`/${collection}[^\\n]*${field}`, "gi"),
    new RegExp(`collection[:\\s]*["']${collection}["'][^\\n]{0,120}${field}`, "gi"),
  ];

  const hits = [];
  for (const [file, text] of files) {
    const rel = path.relative(ROOT, file);
    const fieldHits = countPatterns(text, patterns);
    const collHits =
      GENERIC_FIELDS.has(field) || field.length <= 3
        ? countPatterns(text, collectionPatterns)
        : 0;

    if (fieldHits > 0 || collHits > 0) {
      hits.push({
        file: rel,
        fieldHits,
        collHits,
        score: fieldHits + collHits * 2,
      });
    }
  }

  hits.sort((a, b) => b.score - a.score);
  const top = hits.slice(0, 8);
  const totalScore = hits.reduce((s, h) => s + h.score, 0);

  const fieldSelectorOnly =
    hits.length > 0 &&
    hits.every((h) => h.file.includes("FieldSelector.jsx")) &&
    totalScore <= 3;

  const metadataOnly =
    fieldSelectorOnly ||
    (hits.length > 0 &&
      hits.every(
        (h) =>
          h.file.includes("FieldSelector.jsx") ||
          h.file.includes("field-rename-map") ||
          h.file.includes("incorrect-english") ||
          h.file.includes("field-naming-analysis")
      ));

  let usage = "unused";
  if (totalScore === 0) usage = "unused";
  else if (metadataOnly) usage = "metadata_only";
  else if (totalScore <= 2 && hits.length === 1) usage = "weak";
  else usage = "used";

  return { usage, hits: top, totalScore, hitCount: hits.length };
}

function main() {
  const schema = JSON.parse(fs.readFileSync(SCHEMA, "utf8"));
  const files = loadCodebase();

  const results = [];
  for (const col of schema.collections) {
    for (const f of col.fields) {
      if (f.type === "alias") {
        results.push({
          collection: col.collection,
          field: f.field,
          type: f.type,
          usage: "alias_directus",
          note: "Campo virtual Directus (files); uso via API de arquivos",
        });
        continue;
      }

      const analysis = analyzeField(col.collection, f.field, files);
      results.push({
        collection: col.collection,
        field: f.field,
        type: f.type,
        data_type: f.data_type,
        ...analysis,
      });
    }
  }

  const unused = results.filter((r) => r.usage === "unused");
  const metadataOnly = results.filter((r) => r.usage === "metadata_only");
  const weak = results.filter((r) => r.usage === "weak");
  const alias = results.filter((r) => r.usage === "alias_directus");

  const out = {
    generated_at: new Date().toISOString(),
    scan_dirs: ["src", "kunkserver", "cadastramento"],
    method:
      "Busca por literais de campo, acesso por propriedade e filtros Directus; campos genéricos exigem contexto da collection.",
    stats: {
      total_fields: results.length,
      used: results.filter((r) => r.usage === "used").length,
      weak: weak.length,
      metadata_only: metadataOnly.length,
      unused: unused.length,
      alias: alias.length,
    },
    unused,
    metadata_only: metadataOnly,
    weak,
  };

  const outJson = path.join(
    __dirname,
    "../exports/directus/unused-fields-analysis.json"
  );
  fs.writeFileSync(outJson, JSON.stringify(out, null, 2), "utf8");

  console.log(JSON.stringify(out.stats, null, 2));
  console.log("\n=== NUNCA USADOS (unused) ===");
  for (const r of unused) {
    console.log(`${r.collection}.${r.field}`);
  }
  console.log("\n=== SÓ METADADO/UI (metadata_only) ===");
  for (const r of metadataOnly) {
    console.log(`${r.collection}.${r.field}`);
  }
  console.log("\n=== USO FRACO (weak) ===");
  for (const r of weak) {
    console.log(
      `${r.collection}.${r.field} → ${r.hits.map((h) => h.file).join(", ")}`
    );
  }
  console.log(`\nJSON: ${outJson}`);
}

main();
