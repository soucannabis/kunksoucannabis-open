# Pedidos listagem — fluxo

## Status e payment_date

1. Operador altera status no card (só Aguardando ↔ Pagamento concluído) ou via bulk.
2. `PATCH /orders/:id/status` valida contra `store.order_statuses`.
3. Se **Aguardando → Pagamento concluído** → grava `payment_date = now`.
4. Se **Pagamento concluído → Aguardando** → `payment_date = null`.
5. Sem SCP, cupom ou comissão.

## Etiqueta

1. Flags `modules.loggi.use_for_label` / `modules.melhorenvio.use_for_label`.
2. Preferência visual: `order.freight_carrier`.
3. Create: `POST /modules/{provider}/create-label`.
4. Cancel: `POST /modules/{provider}/cancel` → limpa tracking + status Pagamento concluído.

## Bulk

`POST /orders/bulk` com `action`: `status` | `tags_add` | `tags_remove` | `label_create` | `label_cancel`.
