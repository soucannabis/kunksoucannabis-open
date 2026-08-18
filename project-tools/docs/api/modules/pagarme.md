# Módulo Pagar.me (pagamentos)

> Portar kunkserver (`routes/pagarme.js`, `pagarmeRequest.js`) + PaymentModal para `/api/v1/modules/pagarme`.
> Spec: [`../../frontend/kunk/pagamentos-soucannabis/README.md`](../../frontend/kunk/pagamentos-soucannabis/README.md).
> Docs: [Introdução](https://docs.pagar.me/reference/introdu%C3%A7%C3%A3o-1), [Criar pedido](https://docs.pagar.me/reference/criar-pedido-2), [Pedido com split](https://docs.pagar.me/reference/criar-pedido-com-split-1), [Split](https://docs.pagar.me/reference/split-1), [Recebedores](https://docs.pagar.me/reference/criar-recebedor-1), [Payment links](https://docs.pagar.me/reference/criar-link).

## Ativação

| Flag | Origem |
|---|---|
| `modules.pagarme.enabled` | Admin |
| `modules.pagarme.use_for_orders` | default `false` |
| `modules.pagarme.use_for_services` | default `false` |

Off → `503 MODULE_DISABLED`.

## Prefixo

```
/api/v1/modules/pagarme
```

Upstream v5: `{PAGARME_URL_API}` (default `https://api.pagar.me/core/v5`).  
Auth: Basic `Base64(secret_key + ":")`.

**PSP vs Gateway:** a SouCannabis é PSP; a conta da associação **pode não ser**. Split só em conta **PSP**. Antes de ativar `soucannabis_orders` / qualquer cobrança com split, executar **probe PSP** (ver abaixo). Conta Gateway continua válida para Pagarme **standalone**.

## Credenciais

| field_key | secret | env_fallback |
|---|---|---|
| `secret_key` | sim | `PAGARME_SECRET_KEY` / `PAGARME_TOKEN` |
| `public_key` | não | `PAGARME_PUBLIC_KEY` |
| `api_base_url` | não | `PAGARME_URL_API` |
| `webhook_user` | sim | `PAGARME_WEBHOOK_USER` |
| `webhook_pass` | sim | `PAGARME_WEBHOOK_PASS` |

## Configs

| Key | Default | Uso |
|---|---|---|
| `modules.pagarme.enabled` | `false` | Liga módulo |
| `modules.pagarme.use_for_orders` | `true` | Pedidos |
| `modules.pagarme.use_for_services` | `true` | Serviços |
| `modules.pagarme.success_url` | null | `checkout.success_url` |
| `modules.pagarme.card_fee_percent` | `5` | Taxa cartão (boleto sem taxa) |
| `modules.pagarme.checkout_expires_in` | `10080` | Minutos |
| `modules.pagarme.association_recipient_id` | null | Recebedor da **associação** — **obrigatório** no onboarding Admin se SC for usado |
| `modules.pagarme.soucannabis_recipient_id` | null | Recebedor SC — preenchido pela **API outbound** (SC envia payload) |

## Modos de cobrança

### A) Standalone (SC off)

- Payment Link (`POST /paymentlinks`) sem `split`
- Abas UI: cartão, boleto, **cartão parcial**
- `code` = `order_code` (ou identificador estável do serviço)

### B) Split (`soucannabis_orders` enabled) — só **pedidos** com **total > 0**

Pré-requisitos:

1. Pagarme on + SC on  
2. Conta associação **PSP** (probe ok)  
3. `association_recipient_id` + `soucannabis_recipient_id`  
4. `payment_percentage` de `/me` **inteiro** em `0–100` (não inteiro → bloqueia)

Split com `type: "percentage"`:

```json
"split": [
  { "amount": 8,  "type": "percentage", "recipient_id": "rp_sc…", "options": { "liable": false, "charge_processing_fee": false, "charge_remainder_fee": false } },
  { "amount": 92, "type": "percentage", "recipient_id": "rp_assoc…", "options": { "liable": true, "charge_processing_fee": true, "charge_remainder_fee": true } }
]
```

(`amount` SC = `payment_percentage`; associação = `100 - payment_percentage`.)

UI: **sem cartão parcial**. Só cartão e boleto.  
Total **= 0**: sem Pagarme/split. Serviços: sempre modo A.

### Probe PSP

Rodar no **teste de credentials** Pagarme e no **enable** de Pedidos SouCannabis.

| Resultado | Código | Efeito |
|---|---|---|
| Conta PSP | — | `pagarme_is_psp: true` no status; permite SC/split |
| Conta não PSP / Gateway | `PAGARME_NOT_PSP` | Bloqueia enable SC e `POST /orders` com split |

Implementação: inspecionar capacidades da conta via API Pagarme (recebedores / tipo de conta / tentativa controlada documentada no código). Expor em `GET /status` → `is_psp`, `psp_checked_at`.

Detalhe: [gaps.md §14–§15](../../frontend/kunk/pagamentos-soucannabis/gaps.md).

## Admin

1. Autenticar (Secret key + teste).
2. Criar link de pagamento de teste (`POST /webhooks/test-payment` → `KUNK_WH_*`), abrir o link e
   gerar o boleto sem pagá-lo.
3. Webhooks: cadastrar URLs no painel Pagar.me (com Basic Auth); `POST /webhooks/validate`
   confere se o `order.created` do boleto de teste já chegou. Se ok, ativa
   `modules.pagarme.enabled`. Módulo efetivo exige secret + webhooks `ready`.
4. `association_recipient_id` / `soucannabis_recipient_id` ficam no onboarding SC.

## Endpoints

### `GET /status`

Inclui `split_mode`, `is_psp`, recipients, `use_for_*`, se `%` está ok.

### `POST /orders`

Body app:

```json
{
  "context": "order" | "service",
  "entity_id": 123,
  "methods": ["credit_card"] | ["boleto"],
  "amount_override": null
}
```

Regras:

1. Sem split, monta um Payment Link no servidor (`/paymentlinks`) com `order_code`.
   Com split, monta customer/items/checkout em `/orders`.
2. **`code` = `order_code`** do pedido (ou code de serviço acordado).
3. Se split: validar `is_psp` e `payment_percentage` inteiro; senão `PAGARME_NOT_PSP` / `PAYMENT_PERCENTAGE_NOT_INTEGER`.
4. Se `split_mode` e pedido total > 0 → anexa `payments[].split` (`type: percentage`).
5. Se `split_mode` e parcial → `400 PARTIAL_NOT_ALLOWED`.
6. Persiste `payment_link` (e `payment_code` se houver).

### `POST /recipients`

Proxy criar recebedor (profissionais / uso genérico).

### Recebedor SouCannabis

Exposto no módulo SC: `POST /modules/soucannabis_orders/outbound/pagarme/recipients`  
(payload completo enviado pela SC → cria em Pagarme → grava `soucannabis_recipient_id`).

Admin opcional: `POST /modules/pagarme/recipients/soucannabis` com body (mesmo efeito, role Administrador).

### Webhooks (fonte de pagamento via link)

| Rota | Uso |
|---|---|
| `POST /modules/pagarme/webhook` | Pedidos (caminho público; **HTTP Basic obrigatório**) |
| `POST /modules/pagarme/webhook-service` | Serviços (caminho público; **HTTP Basic obrigatório**) |
| `POST /modules/pagarme/webhooks/test-payment` | Cria link de pagamento `KUNK_WH_*` (passo 2 do Admin) |
| `POST /modules/pagarme/webhooks/validate` | Probe URLs + confere se `order.created` do link já chegou; se ok, ativa o módulo |
| `GET /modules/pagarme/webhooks/status` | Status da última validação |
| `GET /modules/pagarme/webhooks` | Proxy `GET /hooks` (entregas) |
| `GET /modules/pagarme/webhooks/:hookId` | Proxy `GET /hooks/{id}` |
| `POST /modules/pagarme/webhooks/:hookId/retry` | Proxy retry |

`ensure` usa `PUBLIC_API_URL`, gera Basic Auth se vazio (grava em `webhook_user`/`webhook_pass`) e
inclui user/pass na URL enviada à Pagar.me. Evento: [`order.paid`](https://docs.pagar.me/reference/eventos-de-webhook-1).

Comportamento pedidos:

1. Evento `order.paid` (e correlatos pagos).
2. Localiza `orders` onde `order_code` === `hook.data.code` (ou caminho equivalente no payload v5).
3. Atualiza `payment_form`, `payment_date`, status → `Pagamento concluído`.
4. Se `split_mode` e ainda sem `soucannabis_order_id` → dispara create na SC com `external_payment_info`.
5. Sem Pipefy / Beeviral / frete aleatório do legado.

Inbound exige HTTP Basic com `webhook_user` e `webhook_pass` **ambos** preenchidos
(Admin ou env). Sem credenciais → **401** (fail-closed). A resposta 401 não inclui
oráculo de senha (`pass_match` / `expected_user`).

## Meios (UI)

| Aba | Standalone | Split mode |
|---|---|---|
| Cartão | sim (+ taxa) | sim (+ taxa) |
| Boleto | sim | sim |
| Cartão parcial | sim | **não** |

## Autorização

| Ação | Quem |
|---|---|
| Checkout | operador pedidos/serviços |
| Credentials / association recipient | Administrador |
| Recipient SC via outbound | client credentials outbound |
| Webhook | público + validação |

## Seeds

`alter-system-api-credentials-pagarme.sql`, `alter-system-configs-modules-pagarme.sql`.  
Registrar `pagarme` em `SERVICES` / `MODULE_NAMES`.

## Arquivos

```
kunk-api/src/routes/modules/pagarme.js
kunk-api/src/services/pagarme/{client,orders,recipients,split,webhook,hooksSetup}.js
```
