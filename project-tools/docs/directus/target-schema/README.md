# Schema alvo — novo banco PostgreSQL

> Gerado por `npm run schema:target`.

- **Tabelas:** 14
- **Campos:** 290
- **Renames do mapa:** 58
- **Renames junction:** 6
- **Campos excluídos:** 47

## Artefatos

| Arquivo | Descrição |
|---|---|
| `exports/directus/target-schema.json` | Schema completo com `old_name` + `name` |
| `exports/directus/target-schema/collections/*.json` | Uma tabela por arquivo |
| `sql/target-schema.sql` | DDL PostgreSQL inicial |

## Tabelas

| Antiga | Nova | Campos |
|---|---|---:|
| `Kunk_Users` | `kunk_users` | 34 |
| `Orders` | `orders` | 46 |
| `Orders_files` | `orders_files` | 3 |
| `Partners` | `partners` | 21 |
| `Products` | `products` | 17 |
| `Professionals` | `professionals` | 24 |
| `Reception` | `reception` | 25 |
| `reports` | `reports` | 16 |
| `services` | `services` | 32 |
| `services_files` | `services_files` | 3 |
| `Tags` | `tags` | 4 |
| `Users` | `users` | 59 |
| `Users_Api` | `users_api` | 3 |
| `Users_files` | `users_files` | 3 |

## Renames pendentes (decisão de negócio)

