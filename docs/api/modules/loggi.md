# Módulo Loggi

> Integração de cotação de frete, criação de envio/etiqueta e rastreio.
> Reaproveita a lógica do implementação anterior (`routes/loggi.js`, `modules/loggiFreightQuote.js`, `loggiRequest.js`).
> **Não** portar `loggiContentDeclaration.js` (declaração aleatória) — usar `store.freight.content_declaration` (Loja, compartilhada).
> Docs oficiais: [API Loggi](https://docs.api.loggi.com/reference/nossa-documenta%C3%A7%C3%A3o).

## Ativação

| Flag | Origem |
|---|---|
| `modules.loggi.enabled` | Admin (`system_configs`) |
| `modules.loggi.use_for_quote` | default `false` |
| `modules.loggi.use_for_label` | default `false` |

Desabilitado → `503 MODULE_DISABLED` em todas as rotas abaixo.

## Prefixo

```
/api/v1/modules/loggi
```

## Credenciais

Ver [credentials.md](./credentials.md). Campos: `client_id`, `client_secret`, `company_id`, opcional `api_base_url`, `token_url`.

Auth oficial: OAuth 2.0 **client credentials** → `POST https://api.loggi.com/v2/oauth2/token` (implementações antigas hardcodavam URL e secrets — **corrigir** na portagem).

Cascata: `system_api_credentials` → env `LOGGI_*`.

## Infos compartilhadas (admin Loja)

Declaração de conteúdo **não** é por módulo. Todos os providers leem:

| Key | Shape |
|---|---|
| `store.freight.content_declaration` | `{ "description": string, "total_value": number }` |

- Configurável em **Loja → Frete**
- Usada na cotação (`goodsValue`) e no create-label (`contentDeclaration`)
- **Proibido** gerar descrição/valor aleatórios (integrações específicas de associação)

Sem `description` + `total_value` > 0 → `CONFIG_INCOMPLETE` em create-label.

---

## Modalidades de entrega (tipos de serviço)

A Loggi **não** oferece um endpoint de catálogo do tipo “listar serviços”. As modalidades vêm da **própria cotação**:

**Upstream:** `POST /v1/companies/{company_id}/quotations` 
Ref: [Criar Cotação](https://docs.api.loggi.com/reference/quote).

Para cada pacote, `packagesQuotations[].quotations[]` pode retornar até duas opções, tipicamente:

| `freightType` | `freightTypeLabel` (exemplo) |
|---|---|
| `FREIGHT_TYPE_ECONOMIC` | Loggi Econômico |
| `FREIGHT_TYPE_EXPRESS` | Loggi Expresso |

Também retornam `externalServiceId` (SISU), preço e prazo. Os SISUs oficiais da conta são informados pelo Sales Engineering da Loggi na homologação; podem ser configurados no admin (`store.freight.loggi.external_service_ids`) e enviados no body da cotação (`externalServiceIds`). **Não** misturar `externalServiceIds` com `pickupTypes` na mesma request (regra oficial).

No **carrinho**, o operador escolhe entre as modalidades retornadas (ex.: Econômico vs Expresso), não apenas “Loggi” genérico. 
No **admin**, a favorita pode ser `Loggi > econômico` (ver `store.freight.default_option` em [fields.md](../../frontend/kunk/pedidos/fields.md)).

---

## Rotas

### `GET /service-options`

Lista as modalidades conhecidas / configuráveis para a UI de favoritos do admin (sem cotação de CEP).

Como não há catálogo upstream, a resposta é **derivada** de:

1. Enum oficial `FREIGHT_TYPE_ECONOMIC` / `FREIGHT_TYPE_EXPRESS`
2. SISUs configurados em `store.freight.loggi.external_service_ids` (se houver)
3. (Opcional) última cotação de teste bem-sucedida, se quiser enriquecer labels

```json
{
  "data": {
    "provider": "loggi",
    "options": [
      {
        "option_key": "loggi:FREIGHT_TYPE_ECONOMIC",
        "freight_type": "FREIGHT_TYPE_ECONOMIC",
        "label": "Loggi Econômico",
        "external_service_id": null
      },
      {
        "option_key": "loggi:FREIGHT_TYPE_EXPRESS",
        "freight_type": "FREIGHT_TYPE_EXPRESS",
        "label": "Loggi Expresso",
        "external_service_id": null
      }
    ]
  }
}
```

---

### `POST /quote-freight`

Cotação para o endereço de entrega do associado. **Deve devolver todas as modalidades**, não só a mais barata.

**Upstream Loggi:** `POST /v1/companies/{company_id}/quotations` 
Ref: [Criar Cotação](https://docs.api.loggi.com/reference/quote).

Request:

```json
{
  "address": {
    "street": "Rua Exemplo",
    "number": "100",
    "neighborhood": "Centro",
    "complement": "",
    "city": "Goiânia",
    "state": "GO",
    "cep": "74000000"
  }
}
```

Response 200:

```json
{
  "data": {
    "options": [
      {
        "option_key": "loggi:FREIGHT_TYPE_ECONOMIC",
        "provider": "loggi",
        "company": "Loggi",
        "service_label": "Loggi Econômico",
        "freight_type": "FREIGHT_TYPE_ECONOMIC",
        "external_service_id": "DLVR-DROF-DOOR-STAN-01",
        "price": 18.5,
        "eta_days": 5
      },
      {
        "option_key": "loggi:FREIGHT_TYPE_EXPRESS",
        "provider": "loggi",
        "company": "Loggi",
        "service_label": "Loggi Expresso",
        "freight_type": "FREIGHT_TYPE_EXPRESS",
        "external_service_id": "DLVR-DROF-DOOR-STAN-01",
        "price": 22.9,
        "eta_days": 3
      }
    ],
    "cheapest": { "option_key": "loggi:FREIGHT_TYPE_ECONOMIC", "price": 18.5 }
  }
}
```

Compatibilidade: respostas antigas devolviam um único `price`/`serviceLabel`. O OSS usa `options[]`; o front escolhe a linha (favorita admin ou operador).

Regras:

- Origem = **`store.ship_from`** (admin Loja) — nunca endereço fixo no código
- Pacote = **`store.freight.package`** (obrigatório no admin; **sem** peso/dims default no código)
- `goodsValue` = `store.freight.content_declaration.total_value`
- Enviar `externalServiceIds` configurados, se existirem
- Listar todas as `quotations` do pacote
- CEP inválido → “verifique o CEP”
- Sem `ship_from` ou `package` válidos → `CONFIG_INCOMPLETE`
- Retry transitório (3x), exceto 4xx ≠ 429

Requer `use_for_quote=true`.

---

### `POST /create-label` 

Cria envio assíncrono na Loggi e associa ao pedido. Dimensões: `store.freight.label_package ?? store.freight.package`.

**Upstream:** `POST /v1/companies/{company_id}/async-shipments` 
Ref: [Create async shipment](https://docs.api.loggi.com/reference/createasyncshipment) — `freightType`: `FREIGHT_TYPE_ECONOMIC` \| `FREIGHT_TYPE_EXPRESS`.

Request: corpo do pedido (ou `{ orderId }`) + modalidade escolhida:

```json
{
  "orderId": 123,
  "freight_type": "FREIGHT_TYPE_ECONOMIC",
  "external_service_id": "DLVR-DROF-DOOR-STAN-01"
}
```

Se omitido, usar `orders.freight_option` persistido no checkout ou o default da loja.

**Declaração de conteúdo:** ler `store.freight.content_declaration` (preenchida no admin) e enviar no formato Loggi. Números/textos nos exemplos desta doc são ilustrativos — **não** são defaults do sistema.

```json
{
  "documentTypes": [
    {
      "contentDeclaration": {
        "totalValue": "30.00",
        "description": "Produto de aromaterapia"
      }
    }
  ]
}
```

Response: payload Loggi + echo da declaração usada; server grava `tracking_code`, `tracking_code_date`, status, e snapshot em `dce.loggiDeclaration` (cópia da config no momento do envio, para auditoria).

Requer `use_for_label=true` e declaração configurada. 
Elegibilidade (histórico `getLoggiLabelEligibility`): não aguardando pagamento, sem tracking, endereço completo.

---

### `POST /cancel`

Request: `{ "orderId": 1, "tracking_code": "…" }` 
Upstream: cancel package Loggi; limpa `tracking_code` no order; status → `Pagamento concluído` (comportamentversões anteriores — confirmar se OSS mantém).

---

### `POST /packages`

Request: `{ "trackingCode": "…" }` 
Merge details + tracking; response `{ packages: [merged], trackingPartial }`.

---

### `POST /test`

Valida credenciais sem efeito colateral de pedido.

Passos sugeridos:

1. Obter access token OAuth
2. (Opcional) cotação para CEP de `store.ship_from` ou CEP fixo de sandbox

Response:

```json
{
  "data": {
    "ok": true,
    "checks": [
      { "name": "oauth_token", "ok": true },
      { "name": "quotation", "ok": true, "price": 19.9 }
    ]
  }
}
```

Atualiza `last_tested_at` / `last_test_ok` nas rows do serviço.

---

### `GET /status`

```json
{
  "data": {
    "enabled": true,
    "use_for_quote": true,
    "use_for_label": true,
    "credentials_complete": true,
    "credentials_source": "db",
    "last_test_ok": true
  }
}
```

---

## Notas de portagem

| Comportamento | Detalhe |
|---|---|
| client_id/secret no código | credentials / env |
| shipFrom Anápolis / CNPJ / phone hardcoded | **`store.ship_from`** no admin Loja |
| Dimensões/peso / sede hardcoded | **Só** `store.freight.package` + `store.ship_from` no admin (sem fallback numérico) |
| Declaração de conteúdo aleatória (`loggiContentDeclaration.js`) | **Não portar** — usar `store.freight.content_declaration` (compartilhada) |
| Valor declarado fixo 30 no código | `store.freight.content_declaration.total_value` |
| Só a cotação mais barata no cart | Devolver `options[]` (Econômico + Expresso) |
| Sem catálogo de serviços | `GET /service-options` a partir do enum + SISUs config |

## Referências no referências internas

