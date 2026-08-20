# Sync manual legado → OSS

Webhook para o **Kunk legado** enviar atualizações de pedidos à instalação OSS (sync manual / lote).

**Credenciais:** as mesmas de **outbound** (`client_id` / `client_secret` gerados no Admin OSS → colar no External App do legado).

**URLs** (Admin → Pedidos SouCannabis → Mostrar URL do webhook):

```text
POST {OSS_API}/api/v1/modules/soucannabis_orders/webhooks/auth/token
POST {OSS_API}/api/v1/modules/soucannabis_orders/webhooks/orders/sync
```

Token de `…/outbound/auth/token` também vale no sync (mesmo par outbound).

## Fluxo

1. Token: `POST …/auth/token` com `{ client_id, client_secret }` outbound → `access_token` (1h)
2. Sync: `POST …/orders/sync` com `Authorization: Bearer <token>`

Auth alternativa no sync: HTTP Basic ou headers `X-Client-Id` + `X-Client-Secret` (outbound).

## Body

```json
{
  "orders": [{
    "id": 47368,
    "external_id": "uuid-order_code-oss",
    "status": "Aguardando aprovação",
    "tracking_code": "ABC123",
    "external_delivery_type": "loggi"
  }]
}
```

- `external_id` = `order_code` no OSS
- `id` = id do pedido no legado (`soucannabis_order_id` no OSS)

## Regras

- Só **atualiza** pedido que já existe no OSS
- Não cria nem apaga
- Campos = mesmo delta do outbound PATCH

## Resposta

```json
{ "data": { "synced": 1, "failed": 0, "results": [{ "ok": true, "local_order_id": 108, … }] } }
```

`NOT_FOUND` = pedido ainda não existe no OSS.

Cada item do lote gera uma linha em `soucannabis_orders_audit` (mesmo `correlation_id`). Export: `GET …/outbound/audit`.

## Quando usar

| Automático (cada update) | Manual (job/botão) |
|---|---|
| `PATCH …/outbound/orders/:external_id` | `POST …/webhooks/orders/sync` |

Ambos usam **credenciais outbound**.
