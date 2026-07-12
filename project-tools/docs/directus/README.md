# Directus — Estrutura do banco (collections de usuário)

> Documentação gerada automaticamente a partir da API do Directus.
> Collections de sistema (`directus_*` / `_`) e collections fora do escopo open source foram excluídas.

- **Gerado em:** 2026-07-08T15:39:18.694Z
- **Origem:** `https://database.soucannabis.ong.br`
- **Collections no escopo:** 15
- **Campos (total):** 340
- **Relações oficiais (user ↔ user):** 4
- **FKs no schema de campos:** 7
- **Vínculos lógicos (heurística):** 9
- **JSON completo:** `exports/directus/schema.json`
- **Relações:** [relations.md](./relations.md)
- **Vínculos lógicos:** [logical-links.md](./logical-links.md)
- **Campos com inglês incorreto:** [incorrect-english-fields.md](./incorrect-english-fields.md)
- **Análise semântica de nomes:** [field-naming-analysis.md](./field-naming-analysis.md)
- **Mapa oficial old → new:** [field-rename-map.json](./field-rename-map.json) · [field-rename-map.md](./field-rename-map.md)

## Collections excluídas do escopo

As tabelas abaixo existem no Directus de origem, mas **não** entram no produto open source:

- `Coupons`
- `Deliveries`
- `Satisfaction_survey`
- `associados_pipefy`
- `batch_control`
- `changelog`
- `finances`
- `logs`
- `notify`
- `pedidos_pipefy2`
- `utalk`

## Índice de collections

| Collection | Campos | Outgoing | Incoming | Lógicos | Nota |
|---|---:|---:|---:|---:|---|
| [`Kunk_Users`](./collections/Kunk_Users.md) | 42 | 0 | 0 | 1 | — |
| [`Orders`](./collections/Orders.md) | 60 | 1 | 1 | 1 | — |
| [`Orders_files`](./collections/Orders_files.md) | 3 | 1 | 0 | 0 | — |
| [`Partners`](./collections/Partners.md) | 25 | 0 | 0 | 1 | — |
| [`Partners_files`](./collections/Partners_files.md) | 3 | 0 | 0 | 2 | — |
| [`Products`](./collections/Products.md) | 17 | 0 | 0 | 0 | — |
| [`Professionals`](./collections/Professionals.md) | 28 | 0 | 0 | 0 | — |
| [`Reception`](./collections/Reception.md) | 25 | 0 | 0 | 1 | — |
| [`reports`](./collections/reports.md) | 17 | 0 | 0 | 0 | — |
| [`services`](./collections/services.md) | 40 | 0 | 1 | 1 | — |
| [`services_files`](./collections/services_files.md) | 3 | 1 | 0 | 0 | — |
| [`Tags`](./collections/Tags.md) | 4 | 0 | 0 | 0 | — |
| [`Users`](./collections/Users.md) | 67 | 0 | 2 | 2 | — |
| [`Users_Api`](./collections/Users_Api.md) | 3 | 0 | 0 | 0 | — |
| [`Users_files`](./collections/Users_files.md) | 3 | 1 | 0 | 0 | — |

## Mapa de relações oficiais (user ↔ user)

```
Orders.user  →  Users
Orders_files.Orders_id  →  Orders
services_files.services_id  →  services
Users_files.Users_id  →  Users
```

## Observações para a migração open source

1. Nomes de campos/tabelas em inglês com texto incorreto devem ser corrigidos no novo schema PostgreSQL.
2. Relações oficiais no Directus são poucas; a maior parte dos vínculos de negócio é lógica (string/código sem FK).
3. Tabelas junction (`*_files`, M2M) devem virar FKs explícitas no banco unificado.
4. Usar `logical-links.md` como ponto de partida para criar as FKs reais na nova estrutura.

## Como regenerar

```bash
cd project-tools && npm run directus:extract
```
