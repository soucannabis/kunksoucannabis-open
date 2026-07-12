# Produtos

> Catálogo da loja no Kunk OSS: CRUD, estoque, import/export CSV e histórico de uso por pedido.

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/app/loja/produtos` |
| **Componente** | `ProductsPage` |
| **Arquivo** | `apps/kunk/src/pages/store/ProductsPage.jsx` |
| **Permissões menu** | page id `produtos` (`kunk.role_pages`) |
| **RBAC API** | collection `products` (Admin CRUD; Produção RU; Acolhimento/Financeiro R) |

## Descrição

Gerencia o catálogo (`products`): criar, editar, excluir, ajustar estoque e importar/exportar CSV. O estoque (`amount`) é debitado automaticamente quando um pedido passa de **Aguardando pagamento** para **Pagamento concluído**.

## Funcionalidades

- Listagem com busca (sku, nome, tipo, categoria, lote, status)
- CRUD de campos: sku, name, type, unit, concentration, price, amount, category, batch, status
- Exportar CSV do catálogo
- Importar CSV com pré-validação linha a linha e upsert por `sku`
- Ajuste manual de estoque (delta + nota)
- Histórico de movimentos (`sale`, `sale_reversal`, `adjustment`) com vínculo a pedidos

## CSV

Headers:

```text
sku,name,type,unit,concentration,price,amount,category,batch,status
```

Exemplo: `apps/kunk/public/examples/produtos-import-exemplo.csv`

Endpoints:

| Método | Path | Descrição |
|---|---|---|
| GET | `/products/export.csv` | Exporta catálogo |
| POST | `/products/import/validate` | Pré-valida (`csv` ou `rows`) |
| POST | `/products/import` | Executa upsert |
| POST | `/products/:id/stock` | Ajuste manual `{ delta, note }` |
| GET | `/products/:id/movements` | Histórico de uso |

## Estoque e pedidos

- Coluna `orders.stock_debited_at` garante idempotência da baixa
- Tabela `product_stock_movements` registra uso por pedido e ajustes
- Transição awaiting → paid: debita estoque (permite estoque 0 / negativo; grava `stock_at_order` no item)
- Pedidos criados com estoque 0 exibem aviso na listagem e no carrinho
- Transição paid → awaiting **ou** edição do pedido no carrinho (`PATCH /orders/:id`): estorna estoque

SQL: `project-tools/sql/alter-product-stock.sql`

## Status

`implementado` — OSS.
