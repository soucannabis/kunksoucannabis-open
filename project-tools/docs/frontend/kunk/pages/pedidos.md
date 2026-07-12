# Pedidos

> Documentação funcional — Kunk OSS.
> Listagem: [`../pedidos-listagem/`](../pedidos-listagem/README.md). Carrinho/frete: [`../pedidos/`](../pedidos/README.md).

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/app/loja/pedidos` |
| **Componente** | `OrdersPage` + `orders/*` |
| **Permissões** | Administrador \| Acolhimento \| Produção |

## Decisão open-source

| Opção | Escolha |
|---|---|
| **Manter** | Listagem cards, status+payment_date, filtros/facets, bulk, etiqueta Loggi/ME |
| **Remover** | Beeviral, Utalk/WhatsApp, DC-e, relatório produção, SCP no pagamento |
| **Modificar** | Status via `store.order_statuses`; cancel ME novo |

## Status

`implementado` — ver [`../pedidos-listagem/`](../pedidos-listagem/README.md).
