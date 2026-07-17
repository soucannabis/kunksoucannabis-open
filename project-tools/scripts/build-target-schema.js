#!/usr/bin/env node
/**
 * Gera o schema alvo do novo PostgreSQL:
 * - aplica excluded_fields / excluded_tables
 * - aplica renames do field-rename-map.json
 * - padroniza FKs e colunas de junction
 * - exporta target-schema.json, collections/*.json, sql/target-schema.sql, docs
 */

const fs = require("fs");
const path = require("path");

const TOOLS = path.resolve(__dirname, "..");
const SCHEMA_PATH = path.join(TOOLS, "exports/directus/schema.json");
const UNUSED_PATH = path.join(TOOLS, "exports/directus/unused-fields-analysis.json");
const MAP_PATH = path.join(TOOLS, "docs/directus/field-rename-map.json");
const TARGET_JSON = path.join(TOOLS, "exports/directus/target-schema.json");
const TARGET_COLLECTIONS_DIR = path.join(TOOLS, "exports/directus/target-schema/collections");
const TARGET_SQL = path.join(TOOLS, "sql/target-schema.sql");
const TARGET_DOCS = path.join(TOOLS, "docs/directus/target-schema/README.md");

const MANUAL_EXCLUDED = [
  { collection: "Orders", field: "at", reason: "unused", note: "Só label FieldSelector" },
  { collection: "Orders", field: "coupon_id", reason: "scope", note: "Coupons fora do produto open source" },
  { collection: "Users", field: "at", reason: "unused", note: "Sem referência" },
  { collection: "Users", field: "met_us", reason: "unused", note: "Usado em Professionals, não em Users" },
  { collection: "services", field: "at", reason: "unused", note: "Sem referência" },
  { collection: "services", field: "info", reason: "unused", note: "Sem read/write" },
  { collection: "services", field: "message", reason: "unused", note: "Sem read/write" },
  { collection: "services", field: "coupon_id", reason: "scope", note: "Coupons fora do produto open source" },
  { collection: "Professionals", field: "at", reason: "unused", note: "Sem referência" },
  { collection: "Reception", field: "at", reason: "unused", note: "Campo opaco removido do schema OSS" },
  { collection: "Kunk_Users", field: "type", reason: "unused", note: "Sem referência no OSS" },
];

const EXCLUDED_TABLES = [
  {
    old: "Coupons",
    reason: "Estrutura de cupons fora do escopo open source",
  },
  {
    old: "Partners",
    reason: "Parceiros/afiliados removidos do produto open source",
  },
  {
    old: "Partners_files",
    reason: "Junction de Partners; Partners fora do escopo open source",
  },
];

/** Colunas de junction / arquivos — padronização além do mapa de rename. */
const JUNCTION_COLUMN_RENAMES = {
  Orders_files: {
    Orders_id: "order_id",
    directus_files_id: "file_id",
  },
  Users_files: {
    Users_id: "user_id",
    directus_files_id: "file_id",
  },
  services_files: {
    services_id: "service_id",
    directus_files_id: "file_id",
  },
};

const SYSTEM_TABLE_MAP = {
  directus_files: "files",
};

function key(collection, field) {
  return `${collection}.${field}`;
}

function loadExcluded() {
  const unused = JSON.parse(fs.readFileSync(UNUSED_PATH, "utf8"));
  const excluded = [];

  for (const item of [...(unused.unused || []), ...(unused.metadata_only || [])]) {
    excluded.push({
      collection: item.collection,
      field: item.field,
      reason: item.usage,
      note:
        item.usage === "metadata_only"
          ? "Só FieldSelector / relatórios"
          : "Sem uso no código",
    });
  }

  const seen = new Set(excluded.map((e) => key(e.collection, e.field)));
  for (const m of MANUAL_EXCLUDED) {
    const k = key(m.collection, m.field);
    if (!seen.has(k)) {
      excluded.push(m);
      seen.add(k);
    }
  }

  excluded.sort(
    (a, b) =>
      a.collection.localeCompare(b.collection) || a.field.localeCompare(b.field)
  );
  return excluded;
}

function syncMapFile(excluded) {
  const map = JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
  const excludeSet = new Set(excluded.map((e) => key(e.collection, e.field)));
  const excludedTableOld = new Set(EXCLUDED_TABLES.map((t) => t.old));

  map.excluded_tables = EXCLUDED_TABLES;
  map.excluded_fields = excluded;
  map.fields = (map.fields || []).filter(
    (f) =>
      !excludeSet.has(key(f.collection, f.old)) &&
      !excludedTableOld.has(f.collection)
  );
  map.tables = (map.tables || []).filter((t) => !excludedTableOld.has(t.old));

  const excludedKeys = new Set([
    ...excluded.map((e) => key(e.collection, e.field)),
    ...EXCLUDED_TABLES.map((t) => t.old),
  ]);
  map.deferred = map.deferred || {};
  map.deferred.confirm_or_drop = (map.deferred.confirm_or_drop || []).filter(
    (item) => !excludedKeys.has(item)
  );

  map.lookup = { tables: {}, fields: {} };
  for (const t of map.tables) map.lookup.tables[t.old] = t.new;
  for (const f of map.fields) {
    if (!map.lookup.fields[f.collection]) map.lookup.fields[f.collection] = {};
    map.lookup.fields[f.collection][f.old] = f.new;
  }

  map.stats = {
    tables_mapped: map.tables.length,
    tables_renamed: map.tables.filter((t) => t.old !== t.new).length,
    tables_excluded: EXCLUDED_TABLES.length,
    fields_renamed: map.fields.length,
    fields_excluded: excluded.length,
    junction_columns_renamed: Object.values(JUNCTION_COLUMN_RENAMES).reduce(
      (s, o) => s + Object.keys(o).length,
      0
    ),
    deferred_confirm_or_drop: map.deferred.confirm_or_drop.length,
    deferred_decisions: (map.deferred.decisions_needed || []).length,
  };

  fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + "\n", "utf8");
  return map;
}

function resolveFieldName(collection, oldName, map) {
  const junction = JUNCTION_COLUMN_RENAMES[collection]?.[oldName];
  if (junction) return junction;
  return map.lookup.fields[collection]?.[oldName] || oldName;
}

function resolveFkTable(oldTable, map) {
  if (!oldTable) return null;
  if (SYSTEM_TABLE_MAP[oldTable]) return SYSTEM_TABLE_MAP[oldTable];
  return map.lookup.tables[oldTable] || oldTable;
}

function pgType(field) {
  const dt = (field.data_type || "").toLowerCase();
  const max = field.max_length;

  if (dt === "integer") return "INTEGER";
  if (dt === "bigint") return "BIGINT";
  if (dt === "boolean") return "BOOLEAN";
  if (dt === "uuid") return "UUID";
  if (dt === "json" || dt === "jsonb") return "JSONB";
  if (dt === "text") return "TEXT";
  if (dt === "real" || dt === "double precision") return "REAL";
  if (dt === "date") return "DATE";
  if (dt.includes("timestamp with time zone")) return "TIMESTAMPTZ";
  if (dt.includes("timestamp")) return "TIMESTAMP";
  if (dt.includes("character varying") || dt === "varchar") {
    return max ? `VARCHAR(${max})` : "VARCHAR";
  }
  return "TEXT";
}

function buildTargetSchema(map, excluded) {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8"));
  const excludeSet = new Set(excluded.map((e) => key(e.collection, e.field)));
  const excludeTables = new Set(EXCLUDED_TABLES.map((t) => t.old));

  const collections = [];
  let renamesApplied = 0;
  let junctionRenames = 0;

  for (const col of schema.collections) {
    if (excludeTables.has(col.collection)) continue;

    const tableNew = map.lookup.tables[col.collection] || col.collection;
    const fields = [];

    for (const f of col.fields) {
      if (f.type === "alias") continue;
      if (excludeSet.has(key(col.collection, f.field))) continue;

      const newName = resolveFieldName(col.collection, f.field, map);
      if (newName !== f.field) {
        if (JUNCTION_COLUMN_RENAMES[col.collection]?.[f.field]) junctionRenames++;
        else renamesApplied++;
      }

      const fkTable = resolveFkTable(f.foreign_key_table, map);
      let fkColumn = f.foreign_key_column;
      if (fkTable && fkColumn && fkColumn !== "id") {
        const parentCollection = f.foreign_key_table;
        if (parentCollection && map.lookup.fields[parentCollection]?.[fkColumn]) {
          fkColumn = map.lookup.fields[parentCollection][fkColumn];
        }
      }

      fields.push({
        old_name: f.field,
        name: newName,
        type: f.type,
        data_type: f.data_type,
        max_length: f.max_length,
        is_primary_key: f.is_primary_key,
        is_nullable: f.is_nullable,
        is_unique: f.is_unique,
        has_auto_increment: f.has_auto_increment,
        foreign_key_table: fkTable,
        foreign_key_column: fkColumn,
        old_foreign_key_table: f.foreign_key_table,
      });
    }

    collections.push({
      old_table: col.collection,
      table: tableNew,
      fields,
      field_count: fields.length,
    });
  }

  return { collections, renamesApplied, junctionRenames };
}

function writeCollectionsJson(collections) {
  fs.mkdirSync(TARGET_COLLECTIONS_DIR, { recursive: true });
  for (const f of fs.readdirSync(TARGET_COLLECTIONS_DIR)) {
    if (f.endsWith(".json")) fs.unlinkSync(path.join(TARGET_COLLECTIONS_DIR, f));
  }
  for (const col of collections) {
    const payload = {
      table: col.table,
      old_table: col.old_table,
      fields: col.fields.map((f) => ({
        name: f.name,
        old_name: f.old_name,
        pg_type: pgType(f),
        is_primary_key: f.is_primary_key,
        is_nullable: f.is_nullable,
        foreign_key_table: f.foreign_key_table,
        foreign_key_column: f.foreign_key_column,
      })),
    };
    fs.writeFileSync(
      path.join(TARGET_COLLECTIONS_DIR, `${col.table}.json`),
      JSON.stringify(payload, null, 2),
      "utf8"
    );
  }
}

function writeSql(collections) {
  const lines = [];
  lines.push("-- Schema alvo Kunk open source (PostgreSQL)");
  lines.push(`-- Gerado em: ${new Date().toISOString()}`);
  lines.push("-- Não executar em produção sem revisão.");
  lines.push("");

  lines.push("-- Substitui directus_files no produto unificado");
  lines.push("CREATE TABLE IF NOT EXISTS files (");
  lines.push("  id UUID PRIMARY KEY,");
  lines.push("  filename VARCHAR(512),");
  lines.push("  mime_type VARCHAR(128),");
  lines.push("  storage_path TEXT,");
  lines.push("  storage_driver VARCHAR(16) NOT NULL DEFAULT 'local',");
  lines.push("  storage_key TEXT,");
  lines.push("  created_at TIMESTAMPTZ DEFAULT NOW()");
  lines.push(");");
  lines.push("");

  for (const col of collections) {
    lines.push(`-- ${col.old_table} → ${col.table}`);
    lines.push(`CREATE TABLE IF NOT EXISTS ${col.table} (`);

    const colDefs = [];
    const fks = [];

    for (const f of col.fields) {
      let def = `  ${f.name} ${pgType(f)}`;
      if (f.is_primary_key) def += " PRIMARY KEY";
      if (f.has_auto_increment && f.is_primary_key) {
        def = `  ${f.name} SERIAL PRIMARY KEY`;
      }
      if (f.is_nullable === false && !f.is_primary_key) def += " NOT NULL";
      if (f.is_unique && !f.is_primary_key) def += " UNIQUE";
      colDefs.push(def);

      if (f.foreign_key_table && f.foreign_key_column) {
        const refCol = f.foreign_key_column;
        fks.push(
          `  CONSTRAINT fk_${col.table}_${f.name} FOREIGN KEY (${f.name}) REFERENCES ${f.foreign_key_table}(${refCol})`
        );
      }
    }

    lines.push(colDefs.join(",\n"));
    if (fks.length) {
      lines.push(",\n" + fks.join(",\n"));
    }
    lines.push(");");
    lines.push("");
  }

  fs.mkdirSync(path.dirname(TARGET_SQL), { recursive: true });
  fs.writeFileSync(TARGET_SQL, lines.join("\n"), "utf8");
}

function writeDocs(target, map) {
  const lines = [];
  lines.push("# Schema alvo — novo banco PostgreSQL");
  lines.push("");
  lines.push("> Gerado por `npm run schema:target`.");
  lines.push("");
  lines.push(`- **Tabelas:** ${target.stats.tables}`);
  lines.push(`- **Campos:** ${target.stats.fields}`);
  lines.push(`- **Renames do mapa:** ${target.stats.renames_from_map}`);
  lines.push(`- **Renames junction:** ${target.stats.junction_column_renames}`);
  lines.push(`- **Campos excluídos:** ${target.stats.excluded_fields}`);
  lines.push("");
  lines.push("## Artefatos");
  lines.push("");
  lines.push("| Arquivo | Descrição |");
  lines.push("|---|---|");
  lines.push("| `exports/directus/target-schema.json` | Schema completo com `old_name` + `name` |");
  lines.push("| `exports/directus/target-schema/collections/*.json` | Uma tabela por arquivo |");
  lines.push("| `sql/target-schema.sql` | DDL PostgreSQL inicial |");
  lines.push("");
  lines.push("## Tabelas");
  lines.push("");
  lines.push("| Antiga | Nova | Campos |");
  lines.push("|---|---|---:|");
  for (const c of target.collections) {
    lines.push(`| \`${c.old_table}\` | \`${c.table}\` | ${c.field_count} |`);
  }
  lines.push("");
  lines.push("## Renames pendentes (decisão de negócio)");
  lines.push("");
  for (const d of map.deferred?.decisions_needed || []) {
    lines.push(`- **${d.id}:** ${d.fields.join(", ")} (${d.collections.join(", ")})`);
  }
  lines.push("");

  fs.mkdirSync(path.dirname(TARGET_DOCS), { recursive: true });
  fs.writeFileSync(TARGET_DOCS, lines.join("\n"), "utf8");
}

function validateRenames(map, collections) {
  const missing = [];
  for (const r of map.fields) {
    const col = collections.find((c) => c.old_table === r.collection);
    const f = col?.fields.find((x) => x.old_name === r.old);
    if (!f || f.name !== r.new) missing.push(r);
  }
  return missing;
}

function main() {
  const excluded = loadExcluded();
  const map = syncMapFile(excluded);
  const { collections, renamesApplied, junctionRenames } = buildTargetSchema(
    map,
    excluded
  );

  const missing = validateRenames(map, collections);
  if (missing.length) {
    console.error("❌ Renames do mapa não aplicados:", missing);
    process.exit(1);
  }

  const target = {
    generated_at: new Date().toISOString(),
    source: "field-rename-map.json + schema.json − excluded + renames + junction",
    map_version: map.version,
    stats: {
      tables: collections.length,
      fields: collections.reduce((s, c) => s + c.field_count, 0),
      excluded_tables: EXCLUDED_TABLES.length,
      excluded_fields: excluded.length,
      renames_from_map: map.fields.length,
      renames_applied_in_schema: renamesApplied,
      junction_column_renames: junctionRenames,
    },
    collections,
  };

  fs.writeFileSync(TARGET_JSON, JSON.stringify(target, null, 2) + "\n", "utf8");
  writeCollectionsJson(collections);
  writeSql(collections);
  writeDocs(target, map);

  // FK check
  const badFk = [];
  for (const col of collections) {
    for (const f of col.fields) {
      if (f.old_foreign_key_table && f.foreign_key_table) {
        const expected = resolveFkTable(f.old_foreign_key_table, map);
        if (f.foreign_key_table !== expected) {
          badFk.push(`${col.table}.${f.name}`);
        }
      }
    }
  }

  console.log("✓ Renames do mapa: " + map.fields.length + "/" + map.fields.length);
  console.log("✓ Renames junction: " + junctionRenames);
  console.log(
    `✓ target-schema: ${target.stats.tables} tabelas, ${target.stats.fields} campos`
  );
  console.log("✓ SQL: " + TARGET_SQL);
  console.log("✓ Docs: " + TARGET_DOCS);
  if (badFk.length) console.warn("⚠ FK tables:", badFk);
}

main();
