# Módulo Melhor Envio

> Cotação multi-transportadora (Correios, Azul, Jadlog, …) e, opcionalmente, geração de etiquetas.
> Reaproveita `routes/melhorenvio.js`, `melhorEnvioFreightQuote.js`, `melhorenvioAuth.js`.
> Docs oficiais: [Introdução](https://docs.melhorenvio.com.br/reference/introducao-api-melhor-envio) · [Auth](https://docs.melhorenvio.com.br/docs/autenticacao) · [Cálculo de fretes](https://docs.melhorenvio.com.br/reference/calculo-de-fretes-por-produtos) · [Transportadoras](https://docs.melhorenvio.com.br/reference/listar-transportadoras) · [Serviços](https://docs.melhorenvio.com.br/reference/listar-servicos).

## Ativação

| Flag | Origem |
|---|---|
| `modules.melhorenvio.enabled` | Admin (`system_configs`) |
| `modules.melhorenvio.use_for_quote` | default `false` |
| `modules.melhorenvio.use_for_label` | default `false` |

## Prefixo

```
/api/v1/modules/melhorenvio
```

## Credenciais e OAuth

Campos do assistente: `client_id`, `client_secret`, `redirect_uri`, `api_base_url` (prod vs sandbox).

Fluxo OAuth2 (obrigatório para cotação/etiqueta):

1. Admin abre `GET /modules/melhorenvio/oauth/authorize`
2. Usuário autoriza no Melhor Envio (scopes: `shipping-calculate`, `shipping-companies`, `shipping-generate`, `shipping-cancel`, `shipping-tracking`, `cart-write`, …)
3. Callback `GET /oauth/callback?code=` troca por tokens
4. `access_token` / `refresh_token` salvos criptografados em `system_api_credentials`
5. Refresh automático se expira em &lt; 5 min 

**Não** usar arquivo `melhorenvio_tokens.json`.

Bases:

| Ambiente | URL |
|---|---|
| Produção | `https://melhorenvio.com.br` |
| Sandbox | `https://sandbox.melhorenvio.com.br` |

Header obrigatório ME: `User-Agent: Kunk (contato@associacao)` + `Accept: application/json`.

## Infos compartilhadas (admin Loja)

| Key | Shape |
|---|---|
| `store.freight.content_declaration` | `{ "description": string, "total_value": number }` |

- Mesma declaração usada pela Loggi (compartilhada)
- `total_value` → `insurance` / `insurance_value` na cotação e na etiqueta
- **Não** usar lista aleatória de “Brinde Aroma…” anteriores

Sem declaração válida → `CONFIG_INCOMPLETE` em create-label.

---

## Transportadoras e modalidades

O Melhor Envio **não é uma transportadora** — intermedia Correios, Azul, Jadlog, Latam, etc. Cada transportadora tem serviços (ex.: Correios → PAC / Sedex; Azul → Express).

### Catálogo oficial (para admin / favoritos)

| Upstream ME | Uso |
|---|---|
| `GET /api/v2/me/shipment/companies` | Lista transportadoras + serviços aninhados ([docs](https://docs.melhorenvio.com.br/reference/listar-transportadoras)) |
| `GET /api/v2/me/shipment/services` | Lista plana de serviços ([docs](https://docs.melhorenvio.com.br/reference/listar-servicos)) |

Exemplo de hierarquia (resposta companies):

```
Melhor Envio
  └── Correios (id: 1)
        ├── PAC (service id: 1)
        └── Sedex (service id: 2)
  └── Azul (id: …)
        └── Express (service id: …)
```

No admin, a favorita fica no formato:

- `Melhor Envio > Correios > PAC`
- `Melhor Envio > Azul > Express`

Persistida em `store.freight.default_option` (ver [fields.md](../../frontend/kunk/pedidos/fields.md)).

### Cotação no carrinho

`POST /shipment/calculate` devolve preço/prazo **por serviço** disponível para o CEP. O carrinho lista **todas** as opções retornadas (não só Correios/Sedex em versões anteriores), agrupadas por transportadora quando fizer sentido na UI.

---

## Rotas

### `GET /companies`

Proxy autenticado de `GET /api/v2/me/shipment/companies`.

Usado pelo admin (seletor de favorito) e para montar filtros de cotação.

```json
{
  "data": [
    {
      "id": 1,
      "name": "Correios",
      "picture": "…",
      "services": [
        { "id": 1, "name": "PAC", "type": "normal" },
        { "id": 2, "name": "Sedex", "type": "express" }
      ]
    },
    {
      "id": 9,
      "name": "Azul Cargo Express",
      "services": [
        { "id": 15, "name": "Expresso", "type": "express" }
      ]
    }
  ]
}
```

Scope OAuth: `shipping-companies`.

---

### `GET /services`

Proxy de `GET /api/v2/me/shipment/services` (lista plana). Útil para autocomplete / validação de `service_id` no default.

---

### `GET /service-options`

Normaliza companies/services no mesmo shape usado pelo favorito e pelo carrinho:

```json
{
  "data": {
    "provider": "melhorenvio",
    "options": [
      {
        "option_key": "melhorenvio:1:1",
        "company_id": 1,
        "company_name": "Correios",
        "service_id": 1,
        "service_name": "PAC",
        "label": "Melhor Envio > Correios > PAC"
      },
      {
        "option_key": "melhorenvio:1:2",
        "company_id": 1,
        "company_name": "Correios",
        "service_id": 2,
        "service_name": "Sedex",
        "label": "Melhor Envio > Correios > Sedex"
      },
      {
        "option_key": "melhorenvio:9:15",
        "company_id": 9,
        "company_name": "Azul Cargo Express",
        "service_id": 15,
        "service_name": "Expresso",
        "label": "Melhor Envio > Azul > Express"
      }
    ]
  }
}
```

`option_key` estável: `melhorenvio:{company_id}:{service_id}`.

---

### `POST /quote` (preferido) / `POST /correios-quote` 

Cotação multi-serviço. O alias `/correios-quote` permanece por compat, mas no OSS o carrinho usa `/quote` (ou a facade `/freight/quote`).

**Upstream:** `POST /api/v2/me/shipment/calculate` 
Ref: [Cálculo de fretes](https://docs.melhorenvio.com.br/reference/calculo-de-fretes-por-produtos).

Request:

```json
{
  "address": { "cep": "01018020", "street": "…", "city": "…", "state": "SP" },
  "services": "1,2,3,4,17"
}
```

- Se `services` omitido: cotar os IDs habilitados em `store.freight.melhorenvio.enabled_service_ids`, ou **todos** retornados pelo catálogo `/services` (com cuidado de payload).
- Histórico filtrava só `company.id === 1` (Correios). **OSS não restringe a Correios** — devolve Azul, Jadlog, etc., quando a API retornar.

Response 200:

```json
{
  "data": {
    "options": [
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
        "currency": "BRL"
      },
      {
        "option_key": "melhorenvio:1:2",
        "provider": "melhorenvio",
        "company_id": 1,
        "company_name": "Correios",
        "service_id": 2,
        "service_name": "Sedex",
        "service_label": "Correios Sedex",
        "price": 18.4,
        "eta_days": 5,
        "currency": "BRL"
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
        "currency": "BRL"
      }
    ],
    "cheapest": { "option_key": "melhorenvio:1:1", "price": 12.1 },
    "warnings": []
  }
}
```

Pacote: **`store.freight.package`** (admin; obrigatório). Etiqueta: `label_package ?? package`. Origem CEP: **`store.ship_from.cep`**. 
Insurance / valor segurado: `store.freight.content_declaration.total_value`. 
Sem remetente ou pacote → `CONFIG_INCOMPLETE`. 
Erros: 503 se não autenticado; 502 se nenhuma opção.

Requer `use_for_quote=true`.

---

### `POST /create-label` 

Insere frete no carrinho ME / gera etiqueta com o **serviço escolhido** (`service_id` do pedido / default).

```json
{
  "orderId": 123,
  "service_id": 1
}
```

Conteúdo / insurance: `store.freight.content_declaration` (admin Loja, compartilhada). Snapshot opcional no pedido para auditoria.

Requer `use_for_label=true` e declaração configurada. 
Default OSS: **desligado** — quem gera etiqueta é a Loggi.

---

### `POST /cancel`

Cancela envio/carrinho Melhor Envio do pedido.

```json
{ "orderId": 123 }
```

- Usa `carrier_order_code` (id ME) do pedido
- Upstream: `POST /me/shipment/cancel` (`reason_id: 2`); fallback `DELETE /me/cart/{id}`
- Scope OAuth: `shipping-cancel`
- Pós-sucesso: limpa `tracking_code` / `carrier_order_code` e status → **Pagamento concluído**

Requer `use_for_label=true`.

---

### `POST /shipment-calculate`

Proxy genérico (admin/debug) para `/me/shipment/calculate` com `cepFrom` / `cepTo`.

---

### OAuth

| Método | Path | Auth |
|---|---|---|
| GET | `/oauth/authorize` | Admin session |
| GET | `/oauth/callback` | Público (state CSRF) |
| GET | `/oauth/status` | Admin / operador |

Status:

```json
{
  "data": {
    "authenticated": true,
    "expires_at": "…",
    "expires_in": 1209600,
    "will_expire_soon": false
  }
}
```

---

### `POST /test`

1. Credenciais app presentes (id/secret)
2. Tokens válidos (`oauth/status`) ou refresh
3. `GET /companies` (catálogo)
4. Cotação para CEP de teste / `ship_from`

```json
{
  "data": {
    "ok": true,
    "checks": [
      { "name": "app_credentials", "ok": true },
      { "name": "oauth_token", "ok": true },
      { "name": "companies", "ok": true, "count": 7 },
      { "name": "quote", "ok": true, "options": 12 }
    ]
  }
}
```

---

### `GET /status`

Mesmo shape do Loggi (`enabled`, flags quote/label, credentials).

---

## Uso no carrinho vs etiquetas

| Função | Default Melhor Envio | Default Loggi |
|---|---|---|
| Cálculo de frete (todas transportadoras/serviços) | sim | sim (modalidades Econômico/Expresso) |
| Geração de etiqueta | não | sim |

Configurável no admin Serviços externos. Favorito de entrega (ex. `Melhor Envio > Correios > PAC`) no admin Loja — ver [admin.md](../../frontend/kunk/pedidos/admin.md).

## Referências no referências internas

