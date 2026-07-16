# API — contratos para apps (Admin + Kunk)

Base `/api/v1`. Envelope `{ data, meta, errors }`.

## Admin external-services

Estender catálogo com `pagarme` e `soucannabis_orders`.

Erros: `DEPENDENCY_PAGARME`, `DEPENDENCY_SC_ACTIVE`, `SPLIT_NOT_CONFIGURED`, `PARTIAL_NOT_ALLOWED`, `PAGARME_NOT_PSP`, `PAYMENT_PERCENTAGE_NOT_INTEGER`.

## Módulo Pagar.me

| Método | Path | Uso |
|---|---|---|
| `GET` | `/modules/pagarme/status` | flags / split_mode |
| `POST` | `/modules/pagarme/orders` | checkout (+ split se aplicável); `code=order_code` |
| `POST` | `/modules/pagarme/recipients` | criar recebedor (associação/profissional) |
| `POST` | `/modules/pagarme/webhook` | confirmação pagamento pedidos |
| `POST` | `/modules/pagarme/webhook-service` | serviços |

Detalhe: [`../../api/modules/pagarme.md`](../../api/modules/pagarme.md).

## Módulo Pedidos SouCannabis

| Método | Path | Uso |
|---|---|---|
| `GET` | `/modules/soucannabis_orders/status` | |
| `GET` | `/modules/soucannabis_orders/products` | carrinho |
| `GET` | `/modules/soucannabis_orders/tags` | tags readonly |
| `GET` | `/modules/soucannabis_orders/me` | debug / cache |
| `POST` | `/modules/soucannabis_orders/sync/order/:id` | retry |
| `POST` | `/modules/soucannabis_orders/webhooks/auth/token` | Sync manual (credenciais outbound) |
| `POST` | `/modules/soucannabis_orders/webhooks/orders/sync` | Sync manual lote/delta |
| `GET` | `/modules/soucannabis_orders/webhook-info` | Admin: URLs |

Detalhe: [`../../api/modules/soucannabis_orders.md`](../../api/modules/soucannabis_orders.md) · guia legado: [`../../api/modules/soucannabis_orders_webhook_sync.md`](../../api/modules/soucannabis_orders_webhook_sync.md).

## Domínio pedidos (side-effects)

1. Create local: status sempre aguardando; nunca “já pago” no create.
2. Status → pago (webhook / comprovante / total 0): `createIfNeeded` na SC.
3. Reverter → aguardando: PATCH status na SC se mapeado.
4. Update/delete mapeados: mirror SC.
5. Com `split_mode`: API de frete do carrinho retorna vazio/desabilitado; estoque skip.
6. Bloquear PATCH status pago se split + total > 0 e origem ≠ webhook/comprovante (`403 PAYMENT_LOCK`).

## api-client

Helpers: status Pagarme/SC, checkout, products/tags SC, sync retry.
