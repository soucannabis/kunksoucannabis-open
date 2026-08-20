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
| **Manter** | Listagem cards, status+payment_date, filtros/facets, bulk, etiquetas Loggi/ME e relatório de produção |
| **Remover** | Beeviral, Utalk/WhatsApp, DC-e, SCP no pagamento |
| **Modificar** | Status via `store.order_statuses`; cancel ME novo |

## Status

`implementado` — ver [`../pedidos-listagem/`](../pedidos-listagem/README.md).

## Relatório de produção

Marque os pedidos desejados nos checkboxes e use **Ação em massa → Gerar relatório de produção**.
O PDF reúne os itens agregados, o registro de dispensação e as receitas disponíveis; depois da
exportação, os pedidos sem responsável recebem o `production_owner` do operador.
