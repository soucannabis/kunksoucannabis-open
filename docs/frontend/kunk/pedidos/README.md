# Pedidos / Carrinho — Documentação de implementação

> Reimplementação do checkout e da loja no produto unificado (`apps/kunk` + `apps/admin` + `kunk-api`).

## Objetivo

Recriar o fluxo de **novo pedido** com:

1. **Mesma lógica e layout** do carrinhversões anteriores (associado, catálogo, itens, soma, prescritor, **desconto + doação**, pagamento personalizado, histórico)
2. **Sem** cupons, checkbox de comissão, seleção de parceiros e auto-tag de frete
3. **Simulação de frete** via facade, com modalidades e favorito
4. **Admin → Loja** (remetente, caixa, declaração compartilhada, frete no total, favorito)
5. **Admin → Serviços externos** (enable, quote/label, credenciais com teste)
6. **Create** com total validado no server (`TOTAL_MISMATCH` se divergir)

## Fora de escopo (v1 desta feature)

| Item | Motivo |
|---|---|
| Cupons no checkout | Explicitamente excluído |
| Checkbox `no_commission` | Explicitamente excluído |
| Parceiros / Beeviral (`bvid`) | Específico SouCannabis — não portar |
| Rota pública `/cart` sem auth | Unificar em `/app/loja/novo-pedido` autenticado |
| Pagar.me no create do carrinho | Pagamento **pós-pedido** via PaymentModal — spec [`../pagamentos-soucannabis/`](../pagamentos-soucannabis/README.md) |
| Sync Pedidos SouCannabis | Spec [`../pagamentos-soucannabis/`](../pagamentos-soucannabis/README.md) (create remoto só após pago) |
| Etiqueta no momento do create do pedido | Continua na página Pedidos (em versões anteriores) |

## Índice

| Documento | Conteúdo |
|---|---|
| [flow.md](./flow.md) | Fluxos: associado → itens → frete → create → etiqueta |
| [fields.md](./fields.md) | Campos do pedido, totais, configs `store` / credenciais |
| [admin.md](./admin.md) | Área Loja + Serviços externos no admin |
| [api.md](./api.md) | Contratos `kunk-api` (orders, frete, credenciais, teste) |
| [ui-ux.md](./ui-ux.md) | Layout operacional do carrinho em `apps/kunk` |
| [gaps.md](./gaps.md) | Decisões fechadas + checklist de implementação |

Docs de API dos módulos:

| Documento | Conteúdo |
|---|---|
| [`../../api/modules/loggi.md`](../../api/modules/loggi.md) | Cotação, etiqueta, cancelamento, teste Loggi |
| [`../../api/modules/melhorenvio.md`](../../api/modules/melhorenvio.md) | Cotação Correios, etiqueta, OAuth, teste ME |
| [`../../api/modules/credentials.md`](../../api/modules/credentials.md) | Tabela `system_api_credentials` + assistente |
| [`../pagamentos-soucannabis/README.md`](../pagamentos-soucannabis/README.md) | Pagar.me + Pedidos SouCannabis (pagamento, split, catálogo SC) |

## Posicionamento

```
apps/kunk  /app/loja/novo-pedido   ←── operadores (carrinho)
         │
         ├── associado (load / edit / modal / prescrição)
         ├── itens + total
         ├── frete (Loggi / Melhor Envio) → delivery_price
         ├── prescritor (+ modal cadastro)
         ├── pagamento personalizado + histórico
         └── create/update order
         │
         ▼
    kunk-api /v1
         ├── /items/orders | /orders/*
         ├── /modules/loggi/*
         ├── /modules/melhorenvio/*
         └── /admin/external-services/*
         │
         ▼
    PostgreSQL
         ├── orders, users, products, professionals
         ├── system_configs (system = store | modules)
         └── system_api_credentials (secrets criptografados)
         ▲
apps/admin
         ├── /loja              ←── aplicar frete no total, origem, dims
         └── /servicos-externos ←── enable + assistente de API keys
```

## Princípios

| Fazer | Não fazer |
|---|---|
| Replicar layout e soma do `cart.jsx` | Reinventar o checkout |
| Cotar frete via facade e somar no total se `apply_to_total` | Chamar módulos direto no carrinho / só radio Loggi vs Sedex |
| Validar total no server (`TOTAL_MISMATCH` se divergir) | Gravar total cego do client ou overwrite silencioso |
| Manter Desconto + Doação manuais | Remover doação junto com cupons |
| Favorito `store.freight.default_option` | Forçar sempre a mais barata |
| Remetente, dims e declaração **só** via admin (`store.*`, sem hardcode) | Qualquer peso/sede/CNPJ/descrição fixos no código |
| Secrets só se teste ok | Persistir chave inválida |

## Status desta documentação

`pronta para implementação` — bloqueantes fechados (ver [gaps.md](./gaps.md)).
