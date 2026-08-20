# Pagar.me + Pedidos SouCannabis — Documentação de implementação

> Dois serviços externos: **Pagar.me** e **Pedidos SouCannabis** (catálogo/tags/pedidos via API do Kunk central).
> Contrato SC: [`../../external_apps_kunk_doc.md`](../../external_apps_kunk_doc.md) (inclui `external_payment_info`).

## Objetivo

1. **Pagar.me** no Admin — credenciais, teste, webhook, `association_recipient_id`; PaymentModal em pedidos/serviços.
2. **Pedidos SouCannabis** — só com Pagarme ativo; OAuth + teste; recebedor SC cadastrado **pela SC via API**.
3. Carrinho com SC: produtos remotos; **sem frete** e **sem estoque** local.
4. Tags: seção SC **somente leitura** + tags do sistema.
5. Pedido na SC **após** pagamento (webhook Pagarme ou comprovante; total 0 pode ser manual).
6. Com SC ativo e total > 0: cobrança com **split**; confirmação via **webhook** (fonte Pagarme) ou comprovante; `external_payment_info` no create SC.

## Fora de escopo (v1)

| Item | Motivo |
|---|---|
| Beeviral / Pipefy no webhook | Histórico |
| PIX como aba dedicada | Não no PaymentModal histórico; opcional depois |
| Split em serviços / CreateRecipient de profissionais | Fora; `POST /recipients` pode reusar depois |
| Cartão parcial com SC ativo | Proibido com `split_mode` |

## Índice

| Documento | Conteúdo |
|---|---|
| [flow.md](./flow.md) | Onboarding → carrinho → pagamento → sync |
| [fields.md](./fields.md) | Configs, credentials, `orders` |
| [admin.md](./admin.md) | Assistentes Admin |
| [api.md](./api.md) | Contratos apps |
| [ui-ux.md](./ui-ux.md) | PaymentModal, tags, carrinho |
| [gaps.md](./gaps.md) | Decisões + §14 PSP/checkout + §15 `%` inteiro |

API: [`pagarme.md`](../../api/modules/pagarme.md) · [`soucannabis_orders.md`](../../api/modules/soucannabis_orders.md) · [`credentials.md`](../../api/modules/credentials.md)

## Posicionamento

```
apps/admin  /servicos-externos/pagarme | soucannabis_orders
apps/kunk   carrinho / pedidos / tags / serviços(PaymentModal)
kunk-api    /modules/pagarme/*  /modules/soucannabis_orders/*
            → api.pagar.me   → {SC}/api/external
```

## Princípios

| Fazer | Não fazer |
|---|---|
| Split só com SC on e total > 0 | Split “esquecido” com SC on |
| Webhook com `code = order_code` | Cobrança Pagarme sem correlação |
| Create SC após pago (ou total 0) | Espelhar “aguardando” na SC |
| Frete/estoque off no split | Cotar Loggi com catálogo SC |
| Outbound bidirecional | Sync só em uma direção |
| Tags SC readonly | Editar tags remotas no OSS |

## Status

`spec` — decisões fechadas; §14 (PSP) e §15 (`%` inteiro) em [gaps.md](./gaps.md).
