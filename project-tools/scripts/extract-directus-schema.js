#!/usr/bin/env node
/**
 * Extrai collections de usuário do Directus (exclui directus_* / _*),
 * monta o mapa completo de campos e relações e gera:
 * - exports/directus/schema.json
 * - exports/directus/collections/*.json
 * - docs/directus/README.md
 * - docs/directus/relations.md
 * - docs/directus/logical-links.md
 * - docs/directus/collections/*.md
 *
 * Credenciais: kunkserver/.env (DIRECTUS_API_URL, DIRECTUS_API_TOKEN)
 */

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const dotenv = require("dotenv");

const ROOT = path.resolve(__dirname, "../..");
const TOOLS_ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, "kunkserver", ".env");
const EXPORT_DIR = path.join(TOOLS_ROOT, "exports", "directus");
const DOCS_DIR = path.join(TOOLS_ROOT, "docs", "directus");
const COLLECTIONS_DOCS_DIR = path.join(DOCS_DIR, "collections");

dotenv.config({ path: ENV_PATH });

const API_URL = (process.env.DIRECTUS_API_URL || "").replace(/\/$/, "");
const API_TOKEN = process.env.DIRECTUS_API_TOKEN;

/**
 * Collections de usuário que NÃO entram no escopo open source.
 * Permanecem no Directus de origem, mas são ignoradas na extração/docs.
 */
const EXCLUDED_COLLECTIONS = new Set([
  "Coupons",
  "Deliveries",
  "Satisfaction_survey",
  "associados_pipefy",
  "batch_control",
  "changelog",
  "finances",
  "logs",
  "notify",
  "pedidos_pipefy2",
  "utalk",
]);

/** Heurísticas de vínculo lógico (sem FK real no Directus) para a migração. */
const LOGICAL_LINK_RULES = [
  {
    collection: "Orders",
    field: "user_code",
    related_collection: "Users",
    related_field: "user_code",
    note: "Espelho do user_code do associado; FK real é Orders.user → Users.id.",
  },
  {
    collection: "Users",
    field: "partner_code",
    related_collection: "Partners",
    related_field: "user_code",
    note: "Código do parceiro; nome fica em partner_name.",
  },
  {
    collection: "Users",
    field: "responsible_for",
    related_collection: "Users",
    related_field: "user_code",
    note: "user_code do paciente (registro do responsável); no schema alvo vira patient_user_code.",
  },
  {
    collection: "services",
    field: "associate",
    related_collection: "Users",
    related_field: "user_code",
    note: "Código/identificador do associado, sem FK.",
  },
  {
    collection: "Reception",
    field: "associate_code",
    related_collection: "Users",
    related_field: "user_code",
    note: "Código do associado no atendimento, sem FK.",
  },
  {
    collection: "Partners_files",
    field: "Partners_id",
    related_collection: "Partners",
    related_field: "id",
    note: "Junction de arquivos sem meta/relation registrada no Directus.",
  },
  {
    collection: "Partners_files",
    field: "directus_files_id",
    related_collection: "directus_files",
    related_field: "id",
    note: "Junction → arquivo Directus; relation não registrada.",
  },
  {
    collection: "Kunk_Users",
    field: "associates",
    related_collection: "Users",
    related_field: "user_code",
    note: "Lista/texto de associados vinculados ao usuário interno.",
  },
  {
    collection: "Partners",
    field: "associates",
    related_collection: "Users",
    related_field: "user_code",
    note: "Lista/texto de associados do parceiro.",
  },
];

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function isSystemCollection(name) {
  if (!name || typeof name !== "string") return true;
  return name.startsWith("directus_") || name.startsWith("_");
}

function isExcludedCollection(name) {
  return EXCLUDED_COLLECTIONS.has(name);
}

function isInScopeCollection(name) {
  return !isSystemCollection(name) && !isExcludedCollection(name);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function isoNow() {
  return new Date().toISOString();
}

function client() {
  return axios.create({
    baseURL: API_URL,
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
    },
    timeout: 120000,
  });
}

async function getData(http, pathName) {
  const res = await http.get(pathName);
  return res.data?.data ?? res.data;
}

function pickFieldSummary(field) {
  const schema = field.schema || null;
  const meta = field.meta || null;
  return {
    field: field.field,
    type: field.type,
    data_type: schema?.data_type ?? null,
    default_value: schema?.default_value ?? null,
    is_nullable: schema?.is_nullable ?? null,
    is_unique: schema?.is_unique ?? null,
    is_primary_key: schema?.is_primary_key ?? null,
    has_auto_increment: schema?.has_auto_increment ?? null,
    max_length: schema?.max_length ?? null,
    numeric_precision: schema?.numeric_precision ?? null,
    numeric_scale: schema?.numeric_scale ?? null,
    foreign_key_table: schema?.foreign_key_table ?? null,
    foreign_key_column: schema?.foreign_key_column ?? null,
    interface: meta?.interface ?? null,
    special: meta?.special ?? null,
    options: meta?.options ?? null,
    required: meta?.required ?? null,
    readonly: meta?.readonly ?? null,
    hidden: meta?.hidden ?? null,
    note: meta?.note ?? null,
    sort: meta?.sort ?? null,
  };
}

function pickRelationSummary(rel) {
  return {
    source: "directus_relations",
    collection: rel.collection,
    field: rel.field,
    related_collection: rel.related_collection,
    constraint_name: rel.schema?.constraint_name ?? null,
    foreign_key_table: rel.schema?.foreign_key_table ?? null,
    foreign_key_column: rel.schema?.foreign_key_column ?? null,
    on_update: rel.schema?.on_update ?? null,
    on_delete: rel.schema?.on_delete ?? null,
    many_collection: rel.meta?.many_collection ?? null,
    many_field: rel.meta?.many_field ?? null,
    one_collection: rel.meta?.one_collection ?? null,
    one_field: rel.meta?.one_field ?? null,
    junction_field: rel.meta?.junction_field ?? null,
    one_deselect_action: rel.meta?.one_deselect_action ?? null,
  };
}

function inferSchemaForeignKeys(collectionsPayload) {
  const inferred = [];
  for (const c of collectionsPayload) {
    for (const f of c.fields) {
      if (!f.foreign_key_table) continue;
      inferred.push({
        source: "field_schema_fk",
        collection: c.collection,
        field: f.field,
        related_collection: f.foreign_key_table,
        foreign_key_table: f.foreign_key_table,
        foreign_key_column: f.foreign_key_column,
        constraint_name: null,
        on_update: null,
        on_delete: null,
        many_collection: c.collection,
        many_field: f.field,
        one_collection: f.foreign_key_table,
        one_field: null,
        junction_field: null,
        one_deselect_action: null,
      });
    }
  }
  return inferred;
}

function applyLogicalLinks(collectionsPayload, existingKeys) {
  const nameSet = new Set(collectionsPayload.map((c) => c.collection));
  const fieldIndex = new Map();
  for (const c of collectionsPayload) {
    for (const f of c.fields) {
      fieldIndex.set(`${c.collection}.${f.field}`, f);
    }
  }

  const links = [];
  for (const rule of LOGICAL_LINK_RULES) {
    const key = `${rule.collection}.${rule.field}`;
    if (!fieldIndex.has(key)) continue;
    // Já coberto por relation oficial ou FK de schema?
    if (existingKeys.has(key)) continue;
    // related pode ser system (directus_files)
    if (
      rule.related_collection &&
      !nameSet.has(rule.related_collection) &&
      !isSystemCollection(rule.related_collection)
    ) {
      continue;
    }
    links.push({
      source: "logical_heuristic",
      collection: rule.collection,
      field: rule.field,
      related_collection: rule.related_collection,
      related_field: rule.related_field,
      note: rule.note,
      field_type: fieldIndex.get(key).type,
      data_type: fieldIndex.get(key).data_type,
    });
  }
  return links;
}

function relationKey(rel) {
  return `${rel.collection}.${rel.field}`;
}

function buildRelationGraph(userNames, relations) {
  const graph = {};
  for (const name of userNames) {
    graph[name] = { outgoing: [], incoming: [] };
  }

  for (const rel of relations) {
    const from = rel.collection;
    const to = rel.related_collection;
    if (from && graph[from]) graph[from].outgoing.push(rel);
    if (to && graph[to]) graph[to].incoming.push(rel);
  }
  return graph;
}

function mdEscape(value) {
  if (value === null || value === undefined) return "—";
  const str = String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
  return str === "" ? "—" : str;
}

function writeCollectionDoc(collectionPayload) {
  const { collection, meta, schema, fields, relations, logical_links } = collectionPayload;
  const lines = [];

  lines.push(`# Collection: \`${collection}\``);
  lines.push("");
  lines.push(`- **Tabela física:** \`${schema?.name || collection}\``);
  lines.push(`- **Schema SQL:** \`${schema?.schema || "public"}\``);
  lines.push(`- **Singleton:** ${meta?.singleton ? "sim" : "não"}`);
  lines.push(`- **Hidden:** ${meta?.hidden ? "sim" : "não"}`);
  lines.push(`- **Nota:** ${mdEscape(meta?.note)}`);
  lines.push(`- **Campos:** ${fields.length}`);
  lines.push(`- **Relações oficiais (outgoing):** ${relations.outgoing.length}`);
  lines.push(`- **Relações oficiais (incoming):** ${relations.incoming.length}`);
  lines.push(`- **Vínculos lógicos:** ${(logical_links || []).length}`);
  lines.push("");

  lines.push("## Campos");
  lines.push("");
  lines.push(
    "| Campo | Tipo Directus | Tipo SQL | PK | Nullable | Unique | FK → | Interface | Nota |"
  );
  lines.push("|---|---|---|---|---|---|---|---|---|");

  const sortedFields = [...fields].sort(
    (a, b) => (a.sort ?? 9999) - (b.sort ?? 9999) || a.field.localeCompare(b.field)
  );

  for (const f of sortedFields) {
    const fk =
      f.foreign_key_table != null
        ? `\`${f.foreign_key_table}.${f.foreign_key_column}\``
        : "—";
    lines.push(
      `| \`${mdEscape(f.field)}\` | ${mdEscape(f.type)} | ${mdEscape(f.data_type)} | ${
        f.is_primary_key ? "✓" : "—"
      } | ${f.is_nullable === false ? "não" : "sim"} | ${
        f.is_unique ? "✓" : "—"
      } | ${fk} | ${mdEscape(f.interface)} | ${mdEscape(f.note)} |`
    );
  }
  lines.push("");

  lines.push("## Relações de saída (esta collection → outras)");
  lines.push("");
  if (!relations.outgoing.length) {
    lines.push("_Nenhuma relação oficial._");
  } else {
    lines.push("| Campo | Relacionada | FK column | on_delete | Fonte |");
    lines.push("|---|---|---|---|---|");
    for (const r of relations.outgoing) {
      lines.push(
        `| \`${mdEscape(r.field)}\` | \`${mdEscape(r.related_collection)}\` | \`${mdEscape(
          r.foreign_key_column
        )}\` | ${mdEscape(r.on_delete)} | ${mdEscape(r.source)} |`
      );
    }
  }
  lines.push("");

  lines.push("## Relações de entrada (outras → esta collection)");
  lines.push("");
  if (!relations.incoming.length) {
    lines.push("_Nenhuma relação oficial._");
  } else {
    lines.push("| Collection origem | Campo | FK column | on_delete | Fonte |");
    lines.push("|---|---|---|---|---|");
    for (const r of relations.incoming) {
      lines.push(
        `| \`${mdEscape(r.collection)}\` | \`${mdEscape(r.field)}\` | \`${mdEscape(
          r.foreign_key_column
        )}\` | ${mdEscape(r.on_delete)} | ${mdEscape(r.source)} |`
      );
    }
  }
  lines.push("");

  lines.push("## Vínculos lógicos (sem FK no Directus)");
  lines.push("");
  if (!(logical_links || []).length) {
    lines.push("_Nenhum heuristicamente detectado nesta collection._");
  } else {
    lines.push("| Campo | Alvo (collection.field) | Tipo campo | Nota |");
    lines.push("|---|---|---|---|");
    for (const l of logical_links) {
      lines.push(
        `| \`${mdEscape(l.field)}\` | \`${mdEscape(l.related_collection)}.${mdEscape(
          l.related_field
        )}\` | ${mdEscape(l.data_type || l.field_type)} | ${mdEscape(l.note)} |`
      );
    }
  }
  lines.push("");

  const filePath = path.join(COLLECTIONS_DOCS_DIR, `${collection}.md`);
  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
  return filePath;
}

function writeIndexDoc(exportPayload) {
  const { generated_at, source, collections, relation_graph, stats } = exportPayload;
  const lines = [];

  lines.push("# Directus — Estrutura do banco (collections de usuário)");
  lines.push("");
  lines.push("> Documentação gerada automaticamente a partir da API do Directus.");
  lines.push(
    "> Collections de sistema (`directus_*` / `_`) e collections fora do escopo open source foram excluídas."
  );
  lines.push("");
  lines.push(`- **Gerado em:** ${generated_at}`);
  lines.push(`- **Origem:** \`${source.url}\``);
  lines.push(`- **Collections no escopo:** ${stats.collections}`);
  lines.push(`- **Campos (total):** ${stats.fields}`);
  lines.push(`- **Relações oficiais (user ↔ user):** ${stats.user_relations}`);
  lines.push(`- **FKs no schema de campos:** ${stats.schema_fks}`);
  lines.push(`- **Vínculos lógicos (heurística):** ${stats.logical_links}`);
  lines.push(`- **JSON completo:** \`exports/directus/schema.json\``);
  lines.push(`- **Relações:** [relations.md](./relations.md)`);
  lines.push(`- **Vínculos lógicos:** [logical-links.md](./logical-links.md)`);
  lines.push(
    `- **Campos com inglês incorreto:** [incorrect-english-fields.md](./incorrect-english-fields.md)`
  );
  lines.push(
    `- **Análise semântica de nomes:** [field-naming-analysis.md](./field-naming-analysis.md)`
  );
  lines.push(
    `- **Mapa oficial old → new:** [field-rename-map.json](./field-rename-map.json) · [field-rename-map.md](./field-rename-map.md)`
  );
  lines.push("");

  if (source.excluded_collections?.length) {
    lines.push("## Collections excluídas do escopo");
    lines.push("");
    lines.push(
      "As tabelas abaixo existem no Directus de origem, mas **não** entram no produto open source:"
    );
    lines.push("");
    for (const name of source.excluded_collections) {
      lines.push(`- \`${name}\``);
    }
    lines.push("");
  }

  lines.push("## Índice de collections");
  lines.push("");
  lines.push("| Collection | Campos | Outgoing | Incoming | Lógicos | Nota |");
  lines.push("|---|---:|---:|---:|---:|---|");

  const sorted = [...collections].sort((a, b) =>
    a.collection.localeCompare(b.collection)
  );

  for (const c of sorted) {
    const g = relation_graph[c.collection] || { outgoing: [], incoming: [] };
    lines.push(
      `| [\`${c.collection}\`](./collections/${c.collection}.md) | ${c.fields.length} | ${
        g.outgoing.length
      } | ${g.incoming.length} | ${(c.logical_links || []).length} | ${mdEscape(
        c.meta?.note
      )} |`
    );
  }
  lines.push("");

  lines.push("## Mapa de relações oficiais (user ↔ user)");
  lines.push("");
  lines.push("```");
  for (const c of sorted) {
    const g = relation_graph[c.collection] || { outgoing: [] };
    for (const r of g.outgoing) {
      if (isSystemCollection(r.related_collection)) continue;
      lines.push(`${c.collection}.${r.field}  →  ${r.related_collection}`);
    }
  }
  lines.push("```");
  lines.push("");

  lines.push("## Observações para a migração open source");
  lines.push("");
  lines.push(
    "1. Nomes de campos/tabelas em inglês com texto incorreto devem ser corrigidos no novo schema PostgreSQL."
  );
  lines.push(
    "2. Relações oficiais no Directus são poucas; a maior parte dos vínculos de negócio é lógica (string/código sem FK)."
  );
  lines.push(
    "3. Tabelas junction (`*_files`, M2M) devem virar FKs explícitas no banco unificado."
  );
  lines.push(
    "4. Usar `logical-links.md` como ponto de partida para criar as FKs reais na nova estrutura."
  );
  lines.push("");
  lines.push("## Como regenerar");
  lines.push("");
  lines.push("```bash");
  lines.push("cd project-tools && npm run directus:extract");
  lines.push("```");
  lines.push("");

  const indexPath = path.join(DOCS_DIR, "README.md");
  fs.writeFileSync(indexPath, lines.join("\n"), "utf8");
  return indexPath;
}

function writeRelationsDoc(exportPayload) {
  const lines = [];
  lines.push("# Directus — Relações oficiais entre collections");
  lines.push("");
  lines.push(`Gerado em: ${exportPayload.generated_at}`);
  lines.push("");
  lines.push(
    "Inclui relações registradas em `/relations` cuja collection de origem é de usuário."
  );
  lines.push("");
  lines.push(
    "| De (collection.field) | Para | Constraint | on_delete | on_update | Junction | Fonte |"
  );
  lines.push("|---|---|---|---|---|---|---|");

  const rels = exportPayload.relations_from_user
    .slice()
    .sort(
      (a, b) =>
        String(a.collection).localeCompare(String(b.collection)) ||
        String(a.field).localeCompare(String(b.field))
    );

  for (const r of rels) {
    lines.push(
      `| \`${r.collection}.${r.field}\` | \`${mdEscape(r.related_collection)}\` | ${mdEscape(
        r.constraint_name
      )} | ${mdEscape(r.on_delete)} | ${mdEscape(r.on_update)} | ${mdEscape(
        r.junction_field
      )} | ${mdEscape(r.source)} |`
    );
  }
  lines.push("");

  lines.push("## FKs detectados no schema dos campos");
  lines.push("");
  lines.push("| De (collection.field) | Para (table.column) |");
  lines.push("|---|---|");
  for (const r of exportPayload.schema_foreign_keys) {
    lines.push(
      `| \`${r.collection}.${r.field}\` | \`${r.foreign_key_table}.${r.foreign_key_column}\` |`
    );
  }
  lines.push("");

  fs.writeFileSync(path.join(DOCS_DIR, "relations.md"), lines.join("\n"), "utf8");
}

function writeLogicalLinksDoc(exportPayload) {
  const lines = [];
  lines.push("# Directus — Vínculos lógicos (sem FK)");
  lines.push("");
  lines.push(`Gerado em: ${exportPayload.generated_at}`);
  lines.push("");
  lines.push(
    "Campos usados pelo aplicativo para conectar entidades, mas **sem** relação/FK registrada no Directus."
  );
  lines.push(
    "Esses vínculos são candidatos prioritários a virarem chaves estrangeiras no novo PostgreSQL."
  );
  lines.push("");
  lines.push("| De (collection.field) | Para (collection.field) | Tipo | Nota |");
  lines.push("|---|---|---|---|");

  for (const l of exportPayload.logical_links) {
    lines.push(
      `| \`${l.collection}.${l.field}\` | \`${l.related_collection}.${l.related_field}\` | ${mdEscape(
        l.data_type || l.field_type
      )} | ${mdEscape(l.note)} |`
    );
  }
  lines.push("");

  fs.writeFileSync(path.join(DOCS_DIR, "logical-links.md"), lines.join("\n"), "utf8");
}

async function main() {
  if (!API_URL) fail(`DIRECTUS_API_URL não definido em ${ENV_PATH}`);
  if (!API_TOKEN) fail(`DIRECTUS_API_TOKEN não definido em ${ENV_PATH}`);

  console.log(`→ Directus: ${API_URL}`);
  console.log(`→ Env: ${ENV_PATH}`);

  const http = client();

  console.log("→ Buscando collections...");
  const allCollections = await getData(http, "/collections");
  const nonSystemCollections = allCollections.filter(
    (c) => !isSystemCollection(c.collection)
  );
  const excludedFound = nonSystemCollections
    .filter((c) => isExcludedCollection(c.collection))
    .map((c) => c.collection)
    .sort();
  const userCollectionMetas = nonSystemCollections.filter((c) =>
    isInScopeCollection(c.collection)
  );
  const userNames = new Set(userCollectionMetas.map((c) => c.collection));

  console.log(
    `→ ${allCollections.length} collections no Directus; ${nonSystemCollections.length} de usuário; ${userCollectionMetas.length} no escopo; ${excludedFound.length} excluídas`
  );
  if (excludedFound.length) {
    console.log(`→ Excluídas do open source: ${excludedFound.join(", ")}`);
  }

  console.log("→ Buscando relations...");
  const allRelations = await getData(http, "/relations");
  const relationsFromUser = allRelations.filter((r) => userNames.has(r.collection));
  const userRelationsRaw = relationsFromUser.filter(
    (r) => !r.related_collection || userNames.has(r.related_collection)
  );

  console.log(
    `→ ${allRelations.length} relations; ${relationsFromUser.length} saindo de user; ${userRelationsRaw.length} user↔user`
  );

  console.log("→ Buscando fields por collection...");
  const collectionsPayload = [];
  let fieldCount = 0;

  for (const col of userCollectionMetas) {
    const name = col.collection;
    process.stdout.write(`   • ${name}... `);
    const fieldsRaw = await getData(http, `/fields/${encodeURIComponent(name)}`);
    const fields = (fieldsRaw || []).map(pickFieldSummary);
    fieldCount += fields.length;
    console.log(`${fields.length} campos`);

    collectionsPayload.push({
      collection: name,
      meta: col.meta || null,
      schema: col.schema || null,
      fields,
    });
  }

  const relationSummariesFromUser = relationsFromUser.map(pickRelationSummary);
  const relationSummariesUserToUser = userRelationsRaw.map(pickRelationSummary);
  const schemaFks = inferSchemaForeignKeys(collectionsPayload);

  const coveredKeys = new Set([
    ...relationSummariesFromUser.map(relationKey),
    ...schemaFks.map(relationKey),
  ]);
  const logicalLinks = applyLogicalLinks(collectionsPayload, coveredKeys);

  const relationGraph = buildRelationGraph(
    userNames,
    relationSummariesUserToUser
  );

  const logicalByCollection = {};
  for (const l of logicalLinks) {
    if (!logicalByCollection[l.collection]) logicalByCollection[l.collection] = [];
    logicalByCollection[l.collection].push(l);
  }

  for (const c of collectionsPayload) {
    c.relations = relationGraph[c.collection] || { outgoing: [], incoming: [] };
    c.logical_links = logicalByCollection[c.collection] || [];
  }

  const generatedAt = isoNow();
  const exportPayload = {
    generated_at: generatedAt,
    source: {
      url: API_URL,
      env_file: "kunkserver/.env",
      filter:
        "exclude collections starting with directus_ or _, plus EXCLUDED_COLLECTIONS",
      excluded_collections: [...EXCLUDED_COLLECTIONS].sort(),
    },
    stats: {
      collections: collectionsPayload.length,
      fields: fieldCount,
      relations_from_user: relationSummariesFromUser.length,
      user_relations: relationSummariesUserToUser.length,
      schema_fks: schemaFks.length,
      logical_links: logicalLinks.length,
      excluded_collections: excludedFound.length,
    },
    collections: collectionsPayload.map((c) => ({
      collection: c.collection,
      meta: c.meta,
      schema: c.schema,
      fields: c.fields,
      relations: c.relations,
      logical_links: c.logical_links,
    })),
    relations: relationSummariesUserToUser,
    relations_from_user: relationSummariesFromUser,
    schema_foreign_keys: schemaFks,
    logical_links: logicalLinks,
    relation_graph: relationGraph,
  };

  ensureDir(EXPORT_DIR);
  ensureDir(COLLECTIONS_DOCS_DIR);

  for (const file of fs.readdirSync(COLLECTIONS_DOCS_DIR)) {
    if (file.endsWith(".md")) fs.unlinkSync(path.join(COLLECTIONS_DOCS_DIR, file));
  }

  const jsonPath = path.join(EXPORT_DIR, "schema.json");
  fs.writeFileSync(jsonPath, JSON.stringify(exportPayload, null, 2), "utf8");
  console.log(`✓ JSON: ${jsonPath}`);

  const byCollectionDir = path.join(EXPORT_DIR, "collections");
  ensureDir(byCollectionDir);
  for (const file of fs.readdirSync(byCollectionDir)) {
    if (file.endsWith(".json")) fs.unlinkSync(path.join(byCollectionDir, file));
  }
  for (const c of exportPayload.collections) {
    fs.writeFileSync(
      path.join(byCollectionDir, `${c.collection}.json`),
      JSON.stringify(c, null, 2),
      "utf8"
    );
  }

  writeIndexDoc(exportPayload);
  writeRelationsDoc(exportPayload);
  writeLogicalLinksDoc(exportPayload);
  for (const c of exportPayload.collections) {
    writeCollectionDoc(c);
  }

  console.log(`✓ Docs: ${DOCS_DIR}`);
  console.log(
    `✓ Resumo: ${exportPayload.stats.collections} collections, ${exportPayload.stats.fields} fields, ${exportPayload.stats.user_relations} relations user↔user, ${exportPayload.stats.logical_links} vínculos lógicos`
  );
}

main().catch((err) => {
  console.error("❌ Falha na extração Directus:");
  if (err.response) {
    console.error("Status:", err.response.status);
    console.error(JSON.stringify(err.response.data, null, 2));
  } else {
    console.error(err.message || err);
  }
  process.exit(1);
});
