# Pedidos — listagem OSS

> Página `/app/loja/pedidos` no Kunk operacional — layout em cards anteriores, sem BeeViral / WhatsApp / DC-e / relatório de produção.

## Entregue

| Área | Detalhe |
|---|---|
| Layout | Cards, seleção, paginação, cores `#5a7a5b` |
| Facets | Contagem de status + tags (sob demanda) |
| Filtros | busca, status, tags, datas (criação/pagamento) |
| Toggle pagamento | Aguardando ↔ Pagamento concluído + `payment_date` |
| Bulk | status, tags add/remove, gerar/cancelar etiqueta Loggi e ME, relatório de produção PDF |
| Status config | `store.order_statuses` (seed: 2 system) + Admin Loja |

## Exclusões

- BeeViral, WhatsApp/Utalk, DC-e, etiquetas Correio PDF
- Menu Produção separado / FAB estoque SCP
- Cupom, comissão prescritor, FIFO SCP no pagamento

## Docs

- [flow.md](./flow.md)
- [api.md](./api.md)
- [ui-ux.md](./ui-ux.md)
- [gaps.md](./gaps.md)
