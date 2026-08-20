# Módulo Pedidos SouCannabis (`soucannabis_orders`)

> Integra a instalação OSS com a API externa do Kunk SouCannabis.
> Contrato: [`../../external_apps_kunk_doc.md`](../../external_apps_kunk_doc.md) (inclui `external_payment_info`).
> Spec: [`../../frontend/kunk/pagamentos-soucannabis/README.md`](../../frontend/kunk/pagamentos-soucannabis/README.md).
> Depende de [pagarme.md](./pagarme.md) em modo split quando total > 0.

## Dependência

| Condição | Efeito |
|---|---|
| Enable SC sem Pagarme | `400 DEPENDENCY_PAGARME` |
| Disable Pagarme com SC on | Impedir no Admin até desligar SC |
| SC on | `split_mode` (pedidos total > 0); sem frete; sem estoque; tags SC readonly; sync bidirecional |
| Conta Pagarme associação sem PSP | Bloqueia enable / split → `PAGARME_NOT_PSP` |
| `payment_percentage` não inteiro | Bloqueia enable / checkout split / cache como ready → `PAYMENT_PERCENTAGE_NOT_INTEGER` |

## Ativação / configs

| Key | Default | Uso |
|---|---|---|
| `modules.soucannabis_orders.enabled` | `false` | Liga |
| `modules.soucannabis_orders.sync_products` | `true` | Catálogo remoto |
| `modules.soucannabis_orders.sync_tags` | `true` | Tags SC (UI readonly) |
| `modules.soucannabis_orders.sync_orders` | `true` | Sync pedidos |
| `modules.soucannabis_orders.payment_percentage` | null | Cache `/me` — só persiste se **inteiro** 0–100 |
| `modules.soucannabis_orders.remote_app_id` | null | Cache `me.id` |
| `modules.soucannabis_orders.last_me_at` | null | Último `/me` |

Recipients em Pagarme: `association_recipient_id` (Admin) + `soucannabis_recipient_id` (API SC).

## Credenciais (`service=soucannabis_orders`)

| field_key | secret | env_fallback |
|---|---|---|
| `base_url` | não | `SOUCANNABIS_ORDERS_BASE_URL` |
| `client_id` | sim | `SOUCANNABIS_ORDERS_CLIENT_ID` |
| `client_secret` | sim | `SOUCANNABIS_ORDERS_CLIENT_SECRET` |
| `token_url` | não | `SOUCANNABIS_ORDERS_TOKEN_URL` |

Outbound (`soucannabis_orders_outbound`): `client_id` / `client_secret` gerados nesta instalação para a SC chamar de volta.

## Prefixo

```
/api/v1/modules/soucannabis_orders
```

Remoto: `{base_url}/api/external`.

## Endpoints locais (resumo)

| Método | Path | Uso |
|---|---|---|
| `GET` | `/status` | flags + `split_ready` + `is_psp` + se `%` é inteiro |
| `GET` | `/me` | proxy/cache `/me` (valida inteiro) |
| `GET` | `/products` | carrinho |
| `GET` | `/tags` | UI tags (readonly) |
| `POST` | `/test` | token + `/me` + products/tags + probe PSP; falha se `%` decimal |
| `POST` | `/sync/order/:id` | retry create/mirror |

`split_ready` = SC enabled + Pagarme `is_psp` + ambos recipients + `payment_percentage` inteiro.
| `POST` | `/outbound/auth/token` | SC autentica (outbound) |
| `PATCH/DELETE/GET` | `/outbound/orders/:external_id` | SC → OSS |
| `GET` | `/outbound/audit` | Exporta log de auditoria SC↔OSS |
| `POST` | `/outbound/pagarme/recipients` | SC cadastra recebedor (body completo Pagarme) |
| `GET` | `/outbound/users/:user_code` | SC resolve associado local |
| `POST` | `/webhooks/auth/token` | Token com **credenciais outbound** |
| `POST` | `/webhooks/orders/sync` | Sync manual de pedidos (legado → OSS) |
| `GET` | `/webhook-info` | Admin: URLs e exemplo (sessão) |

### Auditoria Outbound

Toda mutação SC↔OSS (PATCH outbound, webhook sync, create/mirror/delete OSS→SC, recipient Pagarme) grava em `soucannabis_orders_audit`.

```text
GET {api}/modules/soucannabis_orders/outbound/audit
  Authorization: Bearer <access_token>
  ?from=&to=&order_code=&soucannabis_order_id=&local_order_id=
  &direction=inbound|outbound&source=&correlation_id=&limit=100&offset=0
```

Resposta: `{ data: { total, limit, offset, items: [...] } }`. Campos de auditoria fazem parte do schema de instalação.

### Webhook de sincronização manual

Guia para o Kunk legado: [`soucannabis_orders_webhook_sync.md`](./soucannabis_orders_webhook_sync.md).

Rota pública (sem sessão), autenticada com as **credenciais outbound** (mesmas de `…/outbound/*`):

```text
POST {api}/modules/soucannabis_orders/webhooks/auth/token
  body: { "client_id", "client_secret" }   # outbound

POST {api}/modules/soucannabis_orders/webhooks/orders/sync
  Authorization: Bearer <access_token>     # ou token de …/outbound/auth/token
  body: { "orders": [ { "id", "external_id", "status", "tracking_code", … } ] }
```

Resolve o pedido local por `external_id` / `order_code` ou por `soucannabis_order_id` / `id` remoto. Aplica o mesmo mapeamento do outbound PATCH (não cria pedido novo).

`POST …/outbound/pagarme/recipients`: cria na conta Pagarme desta instalação, grava `modules.pagarme.soucannabis_recipient_id`, retorna `recipient_id`. Idempotente se já existir (salvo `force: true`).

## Ciclo de vida do pedido

```text
Create local (sempre aguardando; nunca "já pago" no create)
  total > 0 + split → aguarda Pagarme webhook ou comprovante
  total = 0          → pode marcar pago manualmente

Pago (webhook | comprovante | total 0 manual)
  → POST SC com payload + external_payment_info (quando houver)
  → grava soucannabis_order_id

PATCH/DELETE local mapeado → SC
PATCH/DELETE na SC → outbound OSS

Reverter pago → aguardando
  → PATCH SC status "Aguardando pagamento" (não DELETE)
```

### Quem pode marcar “Pagamento concluído”

| Situação | Toggle manual | Comprovante | Webhook Pagarme |
|---|---|---|---|
| SC off | conforme regras pedidos atuais | sim | sim |
| SC on, total > 0 | **não** | **sim** | **sim** |
| SC on, total = 0 | **sim** | n/a | n/a |

### Payload para SC

| Campo | Valor OSS |
|---|---|
| `external_id` | `order_code` (preferencial) ou `String(id)` documentado |
| `user` | **Nome completo** do associado |
| `user_code` | Código do associado **nesta** instalação |
| `name_associate` / `email` / `address` / `items` / `total` / `tags` / … | Como no guia externo |
| `status` | `Pagamento concluído` no create pós-pago |
| `external_payment_info` | Ver abaixo |

A SC trata o pedido como externo e resolve o associado a partir de `user_code` consultando **esta** API (outbound / contrato entre sistemas).

### `external_payment_info`

Campo aceito no contrato SC. Exemplos:

**Via webhook Pagarme (split):**

```json
{
  "provider": "pagarme",
  "paid_at": "…",
  "payment_percentage": 8,
  "local_order_id": 123,
  "local_order_code": "PED-…",
  "pagarme_order_id": "or_…",
  "pagarme_charge_ids": ["ch_…"],
  "payment_method": "credit_card",
  "amount_cents": 15050,
  "split": [
    { "type": "percentage", "amount": 8, "recipient_id": "rp_sc…", "options": { } },
    { "type": "percentage", "amount": 92, "recipient_id": "rp_assoc…", "options": { } }
  ],
  "pagarme_raw": { }
}
```

**Via comprovante:**

```json
{
  "provider": "manual",
  "method": "comprovante",
  "paid_at": "…",
  "local_order_code": "PED-…",
  "note": "…"
}
```

**Total 0:**

```json
{
  "provider": "none",
  "method": "zero_total",
  "paid_at": "…"
}
```

## Carrinho / frete / estoque

Com SC enabled:

1. Produtos só da API remota.
2. **Não** exibir/cotar frete; `delivery_price` = 0 ou omitido (preço SC já inclui).
3. **Não** validar nem decrementar estoque local.

## Tags

Remotas: somente leitura; usadas no select do pedido pelo texto (`tag`). Locais: CRUD normal.

## Sync bidirecional

Obrigatório no v1. Falha remota: log + `soucannabis_sync_error`; não desfaz escrita local (exceto política futura de retry).

Anti-loop em mutações outbound.

## Colunas `orders`

| Campo | Uso |
|---|---|
| `soucannabis_order_id` | id SC |
| `soucannabis_synced_at` | último sync OK |
| `soucannabis_sync_error` | último erro |
| `external_payment_info` | cópia local do JSON enviado |

## Seeds

- `alter-system-api-credentials-soucannabis-orders.sql`
- `alter-system-configs-modules-soucannabis-orders.sql`
- `alter-orders-soucannabis-sync.sql`

## Arquivos

```
kunk-api/src/routes/modules/soucannabis_orders.js
kunk-api/src/services/soucannabis_orders/
  client.js, syncOrders.js, outbound.js, mapProduct.js, mapOrderPayload.js
```
