# Pedidos listagem — API

| Método | Path | Função |
|---|---|---|
| GET | `/orders` | Lista filtrada (`status`, `tags`, `q`, `date_from`, `date_to`, `date_field`, `limit`, `offset`) |
| GET | `/orders/facets` | `{ statusCounts, tagCounts }` |
| GET | `/orders/status-config` | Resolve `store.order_statuses` |
| PATCH | `/orders/:id/status` | Status + `payment_date` |
| POST | `/orders/bulk` | Ações em massa |
| DELETE | `/orders/:id` | Excluir |
| POST | `/modules/loggi/create-label` | Etiqueta Loggi |
| POST | `/modules/loggi/cancel` | Cancel Loggi |
| POST | `/modules/melhorenvio/create-label` | Etiqueta ME |
| POST | `/modules/melhorenvio/cancel` | Cancel ME (novo) |

## Config

| Key | System | Default |
|---|---|---|
| `store.order_statuses` | store | Aguardando pagamento, Pagamento concluído (`system: true`) |
