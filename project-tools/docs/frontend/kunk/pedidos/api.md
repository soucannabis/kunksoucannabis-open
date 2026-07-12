# Pedidos / Carrinho — Requisitos de API

> Contratos para `kunk-api`. Auth: sessão operador + roles da loja.
> Módulos detalhados: [loggi.md](../../api/modules/loggi.md), [melhorenvio.md](../../api/modules/melhorenvio.md), [credentials.md](../../api/modules/credentials.md).

## Prefixo

```
/api/v1
```

---

## 1. Pedidos (domínio)

Reusar `/items/orders` quando suficiente. Rotas de domínio opcionais:

| Método | Path | Função |
|---|---|---|
| POST | `/orders` | Create com validações de checkout |
| PATCH | `/orders/:id` | Update (edição no carrinho) |
| GET | `/orders` | Lista (página Pedidos) |
| GET | `/orders/by-user/:userCode` | Histórico do carrinho |

### Body create (carrinho OSS)

```json
{
  "user": 123,
  "user_code": "A-001",
  "name_associate": "Maria Silva",
  "email": "maria@…",
  "address": { "street": "…", "number": "…", "neighborhood": "…", "city": "…", "state": "GO", "cep": "74000000", "complement": "" },
  "items": [ /* shape fields.md */ ],
  "total": 189.9,
  "delivery_price": 24.5,
  "freight_carrier": "loggi",
  "freight_option": {
    "option_key": "loggi:FREIGHT_TYPE_ECONOMIC",
    "provider": "loggi",
    "freight_type": "FREIGHT_TYPE_ECONOMIC",
    "service_label": "Loggi Econômico",
    "price": 24.5,
    "eta_days": 5
  },
  "discount": 10,
  "donation": 5,
  "custom_payment": [{ "item": "Troca", "qnt": 1, "value": 10 }],
  "prescriber": "Dr. João",
  "prescriber_code": "P-12",
  "info": "",
  "tags": [],
  "status": "Aguardando pagamento",
  "kunk_user": "operador@…"
}
```

**Não aceitar** no v1: `coupon_id`, `no_commission`, `partner`, `partner_code`, `bvid`.  
**Aceitar** `discount` e `donation` (campos manuais do carrinho legado).

Server deve:

1. Recalcular:
   - `products = Σ (item.amount × item.quantity)` — `amount` = preço unitário legado; **sem** re-lookup de catálogo no v1
   - `freight = apply_to_total ? delivery_price : 0`
   - `discount_effective = discount + Σ custom_payment.value`
   - `expected_total = max(0, products + freight - discount_effective - donation)`
2. Se `|total_client - expected_total| > 0.01` → **`400 TOTAL_MISMATCH`**; **não gravar**.
3. Se ok → persistir com `expected_total`, `discount`, `donation`.
4. **Não** alterar `tags` com base no frete.
5. Frete opcional (`delivery_price` 0 / `freight_option` null permitidos).
6. Triagem: após create, completar reception aberta do e-mail com `completion_reason: Pedido` (contrato da triagem OSS).

Detalhe: [gaps.md](./gaps.md) §B, §C, §E, §G.

---

## 2. Produtos e prescritores

| Método | Path | Uso |
|---|---|---|
| GET | `/items/products` | Catálogo do carrinho |
| GET | `/items/professionals` | Prescritores (`is_prescriber`) |
| POST | `/items/professionals` | Novo prescritor (modal) |
| PATCH | `/items/professionals/:id` | Editar |
| PATCH | `/items/users/:id` | Endereço, prescrição, prescritor no associado |

---

## 3. Frete unificado (facade)

O **carrinho** fala com a facade. Os módulos ficam para etiqueta, OAuth, teste e admin.

| Método | Path | Função | Consumidor típico |
|---|---|---|---|
| POST | `/freight/quote` | Cota providers com `use_for_quote` e une modalidades | **Carrinho** |
| GET | `/freight/service-options` | Catálogo para favoritos | Admin Loja + carrinho |
| GET | `/freight/default-option` | Lê `store.freight.default_option` | Carrinho / admin |
| PUT | `/freight/default-option` | Grava favorito | Carrinho (qualquer role do checkout) / admin |

**Por que facade:** um único request devolve Loggi + Melhor Envio já normalizados (`option_key`, price, eta). O front não mergeia `/modules/loggi/…` + `/modules/melhorenvio/…`.

**Rotas diretas** (`/modules/loggi/*`, `/modules/melhorenvio/*`) continuam para create-label, cancel, packages, OAuth e `test`. A facade **internamente** chama os quote dos módulos.

Ver [gaps.md](./gaps.md) §D.

Request quote:

```json
{
  "address": {
    "street": "…",
    "number": "10",
    "neighborhood": "…",
    "complement": "",
    "city": "Goiânia",
    "state": "GO",
    "cep": "74000000"
  },
  "items": [{ "code": "…", "quantity": 1 }]
}
```

Response:

```json
{
  "data": {
    "apply_to_total": true,
    "default_option_key": "melhorenvio:1:1",
    "selected_option_key": "melhorenvio:1:1",
    "options": [
      {
        "option_key": "loggi:FREIGHT_TYPE_ECONOMIC",
        "provider": "loggi",
        "company_name": "Loggi",
        "service_name": "Econômico",
        "service_label": "Loggi Econômico",
        "freight_type": "FREIGHT_TYPE_ECONOMIC",
        "price": 18.5,
        "eta_days": 5,
        "status": "ready"
      },
      {
        "option_key": "loggi:FREIGHT_TYPE_EXPRESS",
        "provider": "loggi",
        "company_name": "Loggi",
        "service_name": "Expresso",
        "service_label": "Loggi Expresso",
        "freight_type": "FREIGHT_TYPE_EXPRESS",
        "price": 22.9,
        "eta_days": 3,
        "status": "ready"
      },
      {
        "option_key": "melhorenvio:1:1",
        "provider": "melhorenvio",
        "company_id": 1,
        "company_name": "Correios",
        "service_id": 1,
        "service_name": "PAC",
        "service_label": "Correios PAC",
        "price": 12.1,
        "eta_days": 9,
        "status": "ready"
      },
      {
        "option_key": "melhorenvio:9:15",
        "provider": "melhorenvio",
        "company_id": 9,
        "company_name": "Azul Cargo Express",
        "service_id": 15,
        "service_name": "Expresso",
        "service_label": "Azul Express",
        "price": 29.0,
        "eta_days": 3,
        "status": "ready"
      }
    ]
  }
}
```

`selected_option_key` = match do favorito se presente na lista; senão cheapest ready.

---

## 4. Módulos — frete e etiqueta

| Método | Path | Módulo |
|---|---|---|
| POST | `/modules/loggi/quote-freight` | Cotação (todas modalidades) |
| GET | `/modules/loggi/service-options` | Catálogo modalidades (favoritos) |
| POST | `/modules/loggi/create-label` | Etiqueta (legado `/create`) |
| POST | `/modules/loggi/cancel` | Cancelar pacote |
| POST | `/modules/loggi/packages` | Tracking / detalhes |
| POST | `/modules/loggi/test` | Teste de credenciais |
| POST | `/modules/melhorenvio/quote` | Cotação multi-transportadora |
| POST | `/modules/melhorenvio/correios-quote` | Alias legado |
| GET | `/modules/melhorenvio/companies` | Transportadoras ME |
| GET | `/modules/melhorenvio/services` | Serviços ME |
| GET | `/modules/melhorenvio/service-options` | Catálogo normalizado (favoritos) |
| POST | `/modules/melhorenvio/create-label` | Etiqueta (legado `/create-delivery`) |
| GET | `/modules/melhorenvio/oauth/authorize` | Inicia OAuth |
| GET | `/modules/melhorenvio/oauth/callback` | Callback |
| GET | `/modules/melhorenvio/oauth/status` | Status tokens |
| POST | `/modules/melhorenvio/test` | Teste |

Se módulo disabled → `503 MODULE_DISABLED`.  
Se credencial ausente → `503 CREDENTIAL_MISSING` ou `CONFIG_INCOMPLETE`.

Payloads e respostas: docs dos módulos.

---

## 5. Serviços externos (admin)

| Método | Path | Função |
|---|---|---|
| GET | `/admin/external-services` | Lista serviços + flags + status credenciais |
| PATCH | `/admin/external-services/:service` | `{ enabled, use_for_quote, use_for_label }` |
| GET | `/admin/external-services/:service/credentials` | Metadados (has_value, source) — **sem secrets** |
| PUT | `/admin/external-services/:service/credentials` | Upsert campos; secrets só write; dispara test |
| POST | `/admin/external-services/:service/test` | Alias do test do módulo |
| DELETE | `/admin/external-services/:service/credentials/:fieldKey` | Remove valor DB (volta para env) |

### GET lista — item

```json
{
  "service": "loggi",
  "enabled": true,
  "use_for_quote": true,
  "use_for_label": true,
  "credentials": {
    "complete": true,
    "source_summary": "db",
    "last_test_ok": true,
    "last_tested_at": "2026-07-11T12:00:00Z"
  },
  "fields_schema": [
    { "field_key": "client_id", "label": "Client ID", "is_secret": true, "required": true },
    { "field_key": "client_secret", "label": "Client Secret", "is_secret": true, "required": true },
    { "field_key": "company_id", "label": "Company ID", "is_secret": false, "required": true }
  ]
}
```

### PUT credentials

```json
{
  "fields": {
    "client_id": "novo-id",
    "client_secret": "novo-secret",
    "company_id": "123"
  },
  "run_test": true
}
```

Campos omitidos / string vazia em secret = **não alterar**.  
`run_test: true` (default): se o teste falhar → **não persiste** o novo valor; responde erro + checks.  
Response: metadados (sem secret) + resultado do teste.

---

## 6. Config loja

Via `/config?system=store` (já especificado no admin). Keys em [fields.md](./fields.md).

Público (carrinho):

```http
GET /config/public?system=store
```

Inclui `store.freight.apply_to_total` e package dims **sem** dados sensíveis do remetente completo se CNPJ for considerado sensível — preferir endpoint autenticado no Kunk para `ship_from` só no server.

---

## 7. Erros específicos

| Code | Quando |
|---|---|
| `MODULE_DISABLED` | Módulo off |
| `CREDENTIAL_MISSING` | Sem DB nem env |
| `CREDENTIAL_INVALID` | Teste/auth falhou |
| `TOTAL_MISMATCH` | `total` do client ≠ calculado no server |
| `CONFIG_INCOMPLETE` | Falta `store.ship_from`, `package` ou `store.freight.content_declaration` |
| `FREIGHT_NO_QUOTE` | Provider não retornou opção |
| `LABEL_NOT_ALLOWED` | `use_for_label=false` para o provider |
