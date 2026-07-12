# Collections

Collections acessíveis via `/api/v1/items/:collection`.  
Nomes = tabelas do schema alvo ([target-schema.sql](../../sql/target-schema.sql)).

## Whitelist

| Collection | PK | Notas |
|---|---|---|
| `users` | `id` | Associados / pacientes / responsáveis |
| `system_users` | `id` | Operadores do painel |
| `orders` | `id` | Pedidos; FK `"user"` → `users.id` |
| `orders_files` | `id` | Junction pedido ↔ arquivo |
| `partners` | `id` | Parceiros / afiliados |
| `products` | `id` | Produtos / SKU |
| `professionals` | `id` | Profissionais / prescritores |
| `reception` | `id` | Triagem / acolhimento |
| `reports` | `id` | Relatórios salvos / dashboards |
| `services` | `id` | Serviços / agendamentos |
| `services_files` | `id` | Junction serviço ↔ arquivo |
| `tags` | `id` | Etiquetas (`contexts`) |
| `users_files` | `id` | Junction user ↔ arquivo |
| `files` | `id` (UUID) | Metadados de arquivo (preferir `/files`) |
| `users_api` | `id` | Legado; preferir `/auth/tokens` |

## Campos sensíveis (nunca expor por default)

| Collection | Campos |
|---|---|
| `system_users` | `password`, `session_token`, `utalk_token` |
| `users` | `account_password`, `session_token` |
| `partners` | `account_password` |
| `users_api` | `token` (plaintext legado) |

## Campos importantes por domínio

### `users`
- `user_code` — UUID público (UNIQUE)
- `associate_name`, `associate_last_name`, `associate_cpf`
- `responsible_code` — se preenchido, o registro é **paciente** e aponta ao `user_code` do associado responsável (FK)
- `patient_user_code` — legado; não usar para a relação paciente↔associado
- `prescriber` / `prescriber_code`
- `ciap_codes`, `handbook`

### `orders`
- `order_code` — UUID interno
- `carrier_order_code` — código transportadora
- `"user"` — FK inteira para `users.id` (nome reservado; serializar como `user` no JSON)
- `prescriber` / `prescriber_code`
- `items` — JSON do carrinho
- `production_owner`, `address_validation`
- `created_by_user_code`

### `services`
- `service_code` — UUID
- `booking_group_code` — grupo de agendamento
- `professional_id` — UUID → `professionals.professional_code` (FK)
- `associate_user_code` — UUID → `users.user_code` (FK)
- `donation`, `payment_info`
- `consultation_date` — data/hora da consulta
- `include=professional,associate` embute os objetos relacionados

### `products`
- `sku` (ex-`cod`), `unit` (ex-`unity`), `batch`, `concentration`

### `tags`
- `contexts` (ex-`session`) — escopos: `orders`, `services`, `reception`

### Junctions `*_files`
- `order_id` / `user_id` / `service_id` + `file_id`
- Preferir endpoints `/files` + attach, em vez de CRUD cru na junction (fase 1 pode permitir ambos)

## Collections **fora** do escopo open source

Não entram na whitelist (existem no Directus de origem, mas não no produto OSS):

`Coupons`, `Deliveries`, `Satisfaction_survey`, `associados_pipefy`, `batch_control`, `changelog`, `finances`, `logs`, `notify`, `pedidos_pipefy2`, `utalk`, `Partners_files`

## Alias JSON da coluna `orders.user`

No Postgres a coluna é `"user"`. Na API JSON:

```json
{ "id": 1, "user": 42, "associate_name": "…" }
```

Documentar no OpenAPI como `user` (integer, FK).
