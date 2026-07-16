# Fluxos — Pagar.me + Pedidos SouCannabis

## 1. Onboarding Admin (ordem)

```text
1. Pagar.me
   · secret_key + teste
   · enable + use_for_orders / use_for_services
   · Criar / informar association_recipient_id (recebedor da associação)
   · Cadastrar URLs de webhook no dashboard Pagarme

2. Pedidos SouCannabis
   · bloqueado até Pagarme enabled
   · base_url + client_id/secret + teste (/token, /me, products, tags)
   · payment_percentage deve ser **inteiro** (decimal → teste falha)
   · probe PSP da conta Pagarme da associação (Gateway → bloqueia)

3. Recebedor SouCannabis (via API)
   · SC chama POST …/outbound/pagarme/recipients com payload completo
     → OSS cria recipient na conta Pagarme da associação
     → grava modules.pagarme.soucannabis_recipient_id
   · (Admin pode colar rp_… já existente só como fallback de suporte)

4. Enable Pedidos SouCannabis
   · exige: Pagarme on + is_psp + teste ok + association_recipient_id
     + soucannabis_recipient_id + payment_percentage inteiro 0–100
```

`split_mode` = SC enabled + PSP + recipients + `%` inteiro. Sem isso → `SPLIT_NOT_CONFIGURED` / `PAGARME_NOT_PSP` / `PAYMENT_PERCENTAGE_NOT_INTEGER`.

---

## 2. Carrinho com Pedidos SouCannabis (`split_mode`)

```text
Novo pedido
  → produtos: GET /modules/soucannabis_orders/products
  → frete: NÃO cotar / NÃO somar (SC já embute no preço)
  → estoque: NÃO validar / NÃO baixar local
  → create local status = "Aguardando pagamento"
  → NÃO chama SC ainda
```

Sem SC: fluxo pedidos atual (frete Loggi/ME, estoque local se houver).

---

## 3. Pagamento

### 3.1 Standalone (Pagarme on, SC off)

```text
PaymentModal: Cartão | Boleto | Cartão parcial
  → POST /modules/pagarme/orders (sem split)
  → code = order_code
  → webhook ou operação local atualiza status
```

### 3.2 Split mode (SC on) + total > 0

```text
PaymentModal: Cartão | Boleto  (sem aba parcial)
  → POST /modules/pagarme/orders com split type=percentage
    (SC = payment_percentage; associação = 100 − %)
  → code = order_code
  → operador compartilha payment_url

Webhook Pagarme order.paid
  → localiza order por code === order_code
  → status = Pagamento concluído + payment_form / payment_date
  → monta external_payment_info
  → POST {SC}/api/external/orders (primeira vez)

OU comprovante enviado pelo operador
  → status = Pagamento concluído
  → external_payment_info.provider = "manual" (sem split Pagarme executado)
  → POST SC

Toggle manual "pago" BLOQUEADO (exceto se total === 0)
```

### 3.3 Total = 0 (com ou sem SC)

```text
Sem PaymentModal / sem split
  → operador pode marcar Pagamento concluído
  → se SC on: POST SC (pode incluir external_payment_info mínimo ou omitir split)
```

### 3.4 Serviços

Sempre standalone Pagarme (sem sync SC), independente de Pedidos SC.

---

## 4. Edição / exclusão / reversão

```text
PATCH local (já sincronizado)  → PATCH SC /orders/:id
DELETE local (já sincronizado) → DELETE SC /orders/:id
antes do sync                  → só local

Reverter pago → aguardando
  → PATCH local
  → se soucannabis_order_id: PATCH SC { status: "Aguardando pagamento", … }
  → NÃO DELETE remoto
```

Anti-loop: mudanças vindas do outbound SC não reenviam para SC.

---

## 5. Tags

```text
Tags do sistema     → CRUD local
Tags SouCannabis    → GET remoto, somente leitura
No pedido           → operador pode selecionar textos das tags SC (readonly source)
```

---

## 6. Outbound bidirecional (obrigatório)

```text
OSS → SC   : POST (após pago) / PATCH / DELETE
SC  → OSS  : PATCH/DELETE/GET …/outbound/orders/:external_id
SC  → OSS  : POST …/outbound/pagarme/recipients  (cadastro recebedor)
SC  → OSS  : (conforme guia) resolve associado via user_code local se a SC consultar
```

Contrato e credenciais outbound no onboarding com a equipe SC.

---

## 7. Diagrama (`split_mode`, total > 0)

```text
[Admin Pagarme + recipient associação]
[SC API → recipient SouCannabis]
         │
         ▼
[Carrinho SC, sem frete/estoque] → create local (aguardando)
         │
         ▼
[PaymentModal cartão/boleto + split]
         │
    ┌────┴────┐
 webhook    comprovante
    └────┬────┘
         ▼
  pago local → POST SC + external_payment_info
         │
   sync bidirecional PATCH/DELETE
```
