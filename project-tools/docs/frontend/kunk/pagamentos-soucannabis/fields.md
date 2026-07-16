# Campos e configs — Pagar.me + Pedidos SouCannabis

## 1. `system_configs` (`system=modules`)

### Pagarme

| Key | Tipo | Default | Descrição |
|---|---|---|---|
| `modules.pagarme.enabled` | bool | `false` | Módulo ativo |
| `modules.pagarme.use_for_orders` | bool | `true` | PaymentModal pedidos |
| `modules.pagarme.use_for_services` | bool | `true` | PaymentModal serviços |
| `modules.pagarme.success_url` | string | `null` | Redirect checkout |
| `modules.pagarme.card_fee_percent` | number | `5` | % cartão |
| `modules.pagarme.checkout_expires_in` | number | `10080` | Minutos |
| `modules.pagarme.association_recipient_id` | string | `null` | Recebedor associação (ID colado no Admin) |
| `modules.pagarme.soucannabis_recipient_id` | string | `null` | Recebedor SC (API outbound) |

### Pedidos SouCannabis

| Key | Tipo | Default | Descrição |
|---|---|---|---|
| `modules.soucannabis_orders.enabled` | bool | `false` | Módulo ativo (`split_mode`) |
| `modules.soucannabis_orders.sync_products` | bool | `true` | Catálogo remoto |
| `modules.soucannabis_orders.sync_tags` | bool | `true` | Tags SC (readonly UI) |
| `modules.soucannabis_orders.sync_orders` | bool | `true` | Sync bidirecional |
| `modules.soucannabis_orders.payment_percentage` | number\|null | `null` | Cache `/me` — só **inteiro** 0–100; decimal bloqueia |
| `modules.soucannabis_orders.remote_app_id` | string\|null | `null` | Cache `me.id` |
| `modules.soucannabis_orders.last_me_at` | string\|null | `null` | ISO último `/me` |

---

## 2. Credenciais

### `pagarme`

`secret_key`, `public_key`, `api_base_url`, `webhook_user`, `webhook_pass` — ver [credentials.md](../../api/modules/credentials.md).

### `soucannabis_orders`

`base_url`, `client_id`, `client_secret`, `token_url`.

### `soucannabis_orders_outbound`

`client_id`, `client_secret`, `orders_path` — SC autenticar de volta nesta instalação.

---

## 3. Colunas `orders`

| Coluna | Tipo | Descrição |
|---|---|---|
| `soucannabis_order_id` | VARCHAR NULL | ID na SC |
| `soucannabis_synced_at` | TIMESTAMPTZ NULL | Último sync OK |
| `soucannabis_sync_error` | TEXT NULL | Último erro |
| `external_payment_info` | JSONB NULL | Cópia local do JSON de auditoria |

Reuso: `payment_link`, `payment_code`, `payment_form`, `payment_date`, `status`, `order_code` (**chave do webhook Pagarme**).

---

## 4. Payload SC — identidade do associado

| Campo SC | Origem OSS |
|---|---|
| `user` | Nome completo do associado |
| `user_code` | Código do associado **local** |
| `name_associate` | Nome (se distinto / complementar) |
| `external_id` | `order_code` preferencial |

A SC resolve o associado via este `user_code` contra a API desta instalação.

---

## 5. `external_payment_info`

Aceito no contrato SC ([guia](../../external_apps_kunk_doc.md)). Shapes: Pagarme+split, `manual`/comprovante, `zero_total` — ver [soucannabis_orders.md](../../api/modules/soucannabis_orders.md).

---

## 6. Flags de comportamento derivadas de `split_mode`

Quando `modules.soucannabis_orders.enabled`:

| Comportamento | Valor |
|---|---|
| Fonte produtos carrinho | remota |
| Frete (quote/label no carrinho) | desligado |
| Estoque | ignorado |
| Aba cartão parcial | oculta |
| Toggle pago (total > 0) | bloqueado (webhook ou comprovante) |

---

## 7. Produto remoto → item

| Remoto | Carrinho |
|---|---|
| `cod`, `name`, `price`, `type`, `photo`, … | seletor OSS; itens no pedido sem FK `products.id` local obrigatória |
