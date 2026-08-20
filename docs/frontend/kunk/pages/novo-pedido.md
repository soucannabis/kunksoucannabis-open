# Novo pedido (carrinho / checkout)

> Documentação funcional da página legada — base para o produto open-source.
> **Spec de implementação OSS:** [`../pedidos/README.md`](../pedidos/README.md).

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/app/loja/novo-pedido` |
| **Componente** | `Cart` |
| **Permissões** | Administrador | Acolhimento | Produção (no Theme) |

## Descrição

Checkout completo: associado, itens, frete, prescritor e pagamento.

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **Loggi** | quote de frete |
| **Melhor Envio** | correios-quote |
| **Pagar.me** | `/api/pagarme/orders` |
| **Beeviral** | match de parceiro |

## Dependências de outras páginas / módulos

- Pedidos
- Triagem
- Produtos
- Parceiros
- Prescritores
- Cupons

## Observações

- Duplicata sem auth em `/cart`
- Antes a cotação **não** entrava no total (“valores estimados”)

## Decisão open-source

| Opção | Escolha |
|---|---|
| **Manter** | Layout/lógica do cart; associado; prescritor + modal; pagamento personalizado; **desconto + doação**; histórico; frete |
| **Remover** | Cupons; comissão; parceiros/Beeviral; `/cart` público; auto-tag pelo frete |
| **Modificar** | Frete no total por default; facade `/freight/quote`; total com `TOTAL_MISMATCH` se divergir; admin Loja + serviços externos |
| **Notas** | Spec: [`../pedidos/`](../pedidos/README.md) |

## Status

`escopo definido` — ver spec [`../pedidos/README.md`](../pedidos/README.md).
