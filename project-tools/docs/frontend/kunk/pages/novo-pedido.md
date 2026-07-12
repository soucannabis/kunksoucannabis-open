# Novo pedido (carrinho / checkout)

> Documentação funcional da página legada — base para o produto open-source.
> Fonte: `kunksoucannabis`.
> **Spec de implementação OSS:** [`../pedidos/README.md`](../pedidos/README.md).

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/app/loja/novo-pedido` |
| **Componente** | `Cart` |
| **Arquivo legado** | `src/components/inputs/cart.jsx` |
| **Permissões** | Administrador | Acolhimento | Produção (no Theme) |

## Descrição

Checkout completo: associado, itens, frete, prescritor e pagamento.

## Funcionalidades (legado)

- Selecionar associado
- Montar itens e lotes
- Cotar frete Loggi e Correios (Melhor Envio)
- Aplicar cupons
- Vincular parceiro (Beeviral) e prescritor
- Criar/atualizar pedido no Directus
- Finalizar triagem vinculada
- PaymentModal (Pagar.me)
- Criar delivery

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **Directus** | orders, users, coupons, partners, professionals, reception |
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
- No legado a cotação **não** entrava no total (“valores estimados”)

## Decisão open-source

| Opção | Escolha |
|---|---|
| **Manter** | Layout/lógica do cart; associado; prescritor + modal; pagamento personalizado; **desconto + doação**; histórico; frete |
| **Remover** | Cupons; comissão; parceiros/Beeviral; `/cart` público; auto-tag pelo frete |
| **Modificar** | Frete no total por default; facade `/freight/quote`; total com `TOTAL_MISMATCH` se divergir; admin Loja + serviços externos |
| **Notas** | Spec: [`../pedidos/`](../pedidos/README.md) |

## Status

`escopo definido` — ver spec [`../pedidos/README.md`](../pedidos/README.md).
