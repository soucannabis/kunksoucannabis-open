# Collections

Collections acessíveis via `/api/v1/items/:collection`.  
Nomes = tabelas do schema alvo ([target-schema.sql](../../sql/target-schema.sql)).

## Whitelist

| Collection | PK | Notas |
|---|---|---|
| `users` | `id` | Associados / pacientes / responsáveis |
| `system_users` | `id` | Operadores do painel |
| `orders` | `id` | Pedidos; FK `"user"` → `users.id` (nullable) e/ou `institutional_client_id` |
| `orders_files` | `id` | Junction pedido ↔ arquivo |
| `institutional_clients` | `id` | Clientes institucionais (não associados) |
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
| `users_api` | `token` (plaintext legado) |

## Campos importantes por domínio

### `users`
- `user_code` — UUID público (UNIQUE)
- `associate_name`, `associate_last_name`, `associate_cpf`
- `responsible_code` — se preenchido, o registro é **paciente** e aponta ao `user_code` do associado responsável (FK canônica)
- `patient_user_code` — no **responsável**: ponteiro do paciente criado no **funil** (`another`). Não é a FK paciente↔associado; não é “paciente ativo” do painel. Em Serviços, serve só para **pré-selecionar** beneficiário (ver docs associados/serviços)
- `prescriber` / `prescriber_code`
- `ciap_codes`, `handbook`, `annotations`

### `products`
- `sku` (ex-`cod`), `unit` (ex-`unity`), `batch`, `concentration`
- `amount` — estoque atual (inteiro)
- Histórico de uso em `product_stock_movements` (serviço de domínio; sem CRUD `/items`)

### `orders`
- `order_code` — UUID interno
- `carrier_order_code` — código transportadora
- `"user"` — FK inteira para `users.id` (nome reservado; serializar como `user` no JSON); nullable se institucional
- `institutional_client_id` / `institutional_client_code` — vínculo com cliente institucional (XOR com associado)
- `associate_name` / `receiver_name` — snapshots de nome (empresa/associado vs recebedor)
- `prescriber` / `prescriber_code`
- `items` — JSON do carrinho
- `stock_debited_at` — quando preenchido, a baixa de estoque da venda já foi aplicada (idempotência)

### `institutional_clients`
- `client_code` — UUID público
- `is_company` — se true, exige `company_name` + `company_cnpj`
- `representative_*` — representante (CPF sempre obrigatório)
- Endereço cadastral + `delivery_address` (mesma lógica de associados)
- `production_owner`, `address_validation`
- `created_by_user_code`

### `services`
- `service_code` — UUID
- `booking_group_code` — grupo de agendamento
- `professional_id` — UUID → `professionals.professional_code` (FK)
- `associate_user_code` — UUID → `users.user_code` (FK) — **sempre o responsável**
- `patient_user_code` — UUID nullable → paciente beneficiário **deste** atendimento (`null` = atendimento ao responsável)
- `patient_name` — snapshot do nome do paciente
- `donation`, `payment_info`
- `consultation_date` — data/hora da consulta
- `include=professional,associate` embute os objetos relacionados

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
