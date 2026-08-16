# Gaps e checklist — Pagar.me + Pedidos SouCannabis

## Decisões fechadas

| # | Decisão |
|---|---|
| 1 | Documentar primeiro; implementar depois |
| 2 | Dois serviços no Admin: `pagarme` e `soucannabis_orders` |
| 3 | SC **só** liga se Pagarme ativo |
| 4 | Com SC ativo (`split_mode`), checkout de pedido **total > 0** usa split (`payment_percentage` + recipients) |
| 5 | Pedido na SC **só após** pagamento concluído no OSS (exceto fluxo total 0 — ver §12) |
| 6 | Update/delete refletem na SC se já houver `soucannabis_order_id`; outbound bidirecional obrigatório |
| 7 | `external_payment_info` no `POST/PATCH` SC — campo do contrato [`external_apps_kunk_doc.md`](../../external_apps_kunk_doc.md) |
| 8 | Produtos do carrinho 100% da SC quando `sync_products` |
| 9 | Tags SouCannabis: **somente leitura** na UI (envio pelo texto correto da SC) |
| 10 | PaymentModal: cartão + boleto; **sem cartão parcial** quando `split_mode` |
| 11 | Serviços: Pagarme standalone (sem sync SC / sem split SC) |
| 12 | Não portar Beeviral/Pipefy/frete aleatório do webhook legado |
| 13 | Recebedor associação: **ID informado no Admin** (cadastro feito no painel Pagar.me). Recebedor SC: **SouCannabis envia payload via API** outbound e o OSS cria/grava `soucannabis_recipient_id` |
| 14 | API Pagarme v5; webhook é a fonte de verdade para pagamento via link; **ativar split só se conta associação for PSP** (probe) |
| 15 | Com `split_mode`: **não cotar frete**; **ignorar estoque** local |
| 15b | `payment_percentage` **inteiro** 0–100; decimal → bloquear (`PAYMENT_PERCENTAGE_NOT_INTEGER`); split com `type: percentage` |
| 16 | Payload SC: `user` = nome completo; `user_code` = código do associado **local** (SC resolve via API desta instalação) |
| 17 | Webhook correlaciona pelo `code` = `order_code` do pedido local |
| 18 | Total 0: sem split / sem PaymentModal obrigatório; pode marcar pago manualmente e sync na SC |
| 19 | Com `split_mode` e total > 0: **não** marcar “Pagamento concluído” só com toggle; só webhook Pagarme **ou** comprovante |
| 20 | Reverter pago → aguardando: permitido; espelha na SC via `PATCH` de status (não apaga o pedido remoto) |

## Regras de status (pagamento) — resumo

| Contexto | Como vira “Pagamento concluído” | Depois |
|---|---|---|
| Pagarme **sem** SC (standalone) | Webhook e/ou fluxo legado (comprovante / operação) | Só local |
| `split_mode` + total **> 0** | **Webhook** Pagarme **ou** upload de **comprovante** | `POST` pedido na SC + `external_payment_info` |
| `split_mode` + total **= 0** | Toggle/manual permitido | `POST` SC **sem** split / sem Pagarme |
| Qualquer + reverter → aguardando | Operador (regra de permissão) | `PATCH` status na SC se já sincronizado |

## Fechados tecnicamente (14 / 15)

### §14 — Split + Checkout + verificação PSP

A **SouCannabis** opera como PSP. A **associação** (conta Pagarme desta instalação) pode ser só Gateway — e **Gateway não faz split**.

| Regra | Comportamento |
|---|---|
| Pagarme standalone (SC off) | Pode funcionar em conta Gateway ou PSP |
| Ativar `soucannabis_orders` / `split_mode` | **Obrigatório** conta da associação ser **PSP** |
| Verificação | No teste de credentials Pagarme e ao enable SC: probe PSP (ex.: capacidade de recebedores/split na conta; ver `pagarme.md`) |
| Conta não PSP | Bloquear enable SC e qualquer cobrança com split → `400 PAGARME_NOT_PSP` + mensagem no Admin |

**Cobrança (mecanismo):**

| Modo | Preferência |
|---|---|
| Standalone / onboarding / serviços | `POST /paymentlinks` com `order_code` (= `order_code`/`service_code` local), `max_paid_sessions: 1` |
| `split_mode` SC (pedido total > 0, conta PSP) | `POST /orders` + `payment_method: "checkout"` + `payments[].split` + `code = order_code` |
| Fallback split (só se homologar falha do checkout) | Payment Link com `split_settings` (por ora, só cartão) |

Conta PSP + checkout + split precisarão homologação, mas **sem probe PSP ok o módulo SC nem liga**.

### §15 — `payment_percentage` deve ser inteiro

Pagarme exige `%` inteiro em `type: "percentage"`.

| Regra | Comportamento |
|---|---|
| Valor de `/me` | Aceitar só número **inteiro** em `0–100` (ex.: `8`, não `7.5`) |
| Decimal / não inteiro | **Bloquear** a ação → `400 PAYMENT_PERCENTAGE_NOT_INTEGER` |
| Onde valida | Refresh `/me`, enable SC, create checkout com split, teste de conexão SC |
| Split enviado | `type: "percentage"` com `amount: payment_percentage` e `amount: 100 - payment_percentage` |

Não converter decimal para `flat`. Ajustar o cadastro do `%` na SC para inteiro.

## Checklist de implementação

### Docs / índices

- [x] Spec inicial
- [x] Ajustes decisões 1–13 + §14 PSP + §15 `%` inteiro
- [x] Inconsistências internas serviços vs PaymentModal alinhadas

### SQL / config

- [ ] Alters credentials + configs pagarme
- [ ] Alters credentials + configs soucannabis_orders (+ outbound)
- [ ] Alter `orders` sync columns + `external_payment_info`
- [ ] `.env.example`
- [ ] `SERVICES` / `MODULE_NAMES`

### API

- [ ] Client Pagarme + probe PSP (`is_psp`) + `/orders` checkout (+ split percentage) + recipients
- [ ] Validação `payment_percentage` inteiro (`PAYMENT_PERCENTAGE_NOT_INTEGER`)
- [ ] Webhook `order.paid` por `code` = `order_code`
- [ ] Client SC + create-on-paid + mirror patch/delete + revert status
- [ ] Outbound bidirecional (auth + orders + recipients SC)
- [ ] Admin: onboarding association recipient + bloqueios split
- [ ] Frete/estoque desligados quando `split_mode`
- [ ] Testes

### Admin / Kunk

- [ ] Assistentes Pagarme + Pedidos SC
- [ ] PaymentModal (ocultar parcial no split)
- [ ] Carrinho: produtos SC, sem frete no split
- [ ] Tags SC readonly
- [ ] Comprovante / bloqueio toggle pago
- [ ] Sync indicators

### Homologação

- [ ] Conta associação PSP (probe) + rejeição se Gateway
- [ ] `%` inteiro ok / decimal bloqueado
- [ ] 2 recipients + pedido `/orders` + checkout + split
- [ ] Webhook → SC com `external_payment_info`
- [ ] Total 0 / comprovante / revert
- [ ] Outbound SC ↔ OSS
