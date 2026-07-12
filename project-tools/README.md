# project-tools

Ferramentas de suporte ao projeto Kunk open source: scripts de observação, extrações, migrations, testes auxiliares e documentação técnica de módulos.

## Estrutura

```
project-tools/
├── docs/           # Documentação técnica gerada ou escrita à mão
│   ├── api/        # Especificação da nova API REST (Kunk API v1)
│   └── directus/   # Schema Directus + schema alvo do novo banco
├── exports/        # Artefatos JSON / dumps de apoio
│   └── directus/   # schema.json, target-schema.json, collections/
├── sql/            # DDL PostgreSQL (target-schema.sql)
├── scripts/        # Scripts executáveis (Node)
└── package.json
```

## Documentação da nova API

Especificação completa (auth, `/items`, permissões, files, módulos, OpenAPI):

→ [`docs/api/README.md`](./docs/api/README.md)

## Pré-requisitos

- Credenciais Directus em `kunkserver/.env`:
  - `DIRECTUS_API_URL`
  - `DIRECTUS_API_TOKEN`

## Scripts

### Extrair schema do Directus

Lê as collections criadas pelo usuário (ignora `directus_*` e `_`), monta o mapa de campos, relações oficiais, FKs de schema e vínculos lógicos (heurística), e gera:

- `exports/directus/schema.json` — dump completo
- `exports/directus/collections/*.json` — uma collection por arquivo
- `docs/directus/README.md` — índice
- `docs/directus/relations.md` — relações oficiais + FKs
- `docs/directus/logical-links.md` — vínculos sem FK (candidatos a FK na migração)
- `docs/directus/collections/*.md` — documentação por collection

```bash
cd project-tools
npm install
npm run directus:extract
npm run fields:unused      # análise de campos não usados
npm run schema:target      # renames + exclusões → target-schema.json + SQL
```
