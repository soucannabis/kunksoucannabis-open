# Directus — Relações oficiais entre collections

Gerado em: 2026-07-08T15:39:18.694Z

Inclui relações registradas em `/relations` cuja collection de origem é de usuário.

| De (collection.field) | Para | Constraint | on_delete | on_update | Junction | Fonte |
|---|---|---|---|---|---|---|
| `Orders.user` | `Users` | orders_user_foreign | SET NULL | NO ACTION | — | directus_relations |
| `Orders_files.directus_files_id` | `directus_files` | orders_files_directus_files_id_foreign | SET NULL | NO ACTION | Orders_id | directus_relations |
| `Orders_files.Orders_id` | `Orders` | orders_files_orders_id_foreign | SET NULL | NO ACTION | directus_files_id | directus_relations |
| `services_files.directus_files_id` | `directus_files` | services_files_directus_files_id_foreign | SET NULL | NO ACTION | services_id | directus_relations |
| `services_files.services_id` | `services` | services_files_services_id_foreign | SET NULL | NO ACTION | directus_files_id | directus_relations |
| `Users_files.directus_files_id` | `directus_files` | users_files_directus_files_id_foreign | SET NULL | NO ACTION | Users_id | directus_relations |
| `Users_files.Users_id` | `Users` | users_files_users_id_foreign | SET NULL | NO ACTION | directus_files_id | directus_relations |

## FKs detectados no schema dos campos

| De (collection.field) | Para (table.column) |
|---|---|
| `Orders.user` | `Users.id` |
| `Orders_files.Orders_id` | `Orders.id` |
| `Orders_files.directus_files_id` | `directus_files.id` |
| `services_files.services_id` | `services.id` |
| `services_files.directus_files_id` | `directus_files.id` |
| `Users_files.Users_id` | `Users.id` |
| `Users_files.directus_files_id` | `directus_files.id` |
