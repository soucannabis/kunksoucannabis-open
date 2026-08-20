# Módulo Geoapify (verificação de endereço)

> Validação composta **ViaCEP (Correios)** + **Geoapify Geocode Search**, portada do implementação anterior (`routes/geoapify.js`, `modules/viacepCorreios.js`, `modules/geoapifyCompositeValidation.js`).
> Docs: [Geoapify Geocoding](https://www.geoapify.com/geocoding-api/), [ViaCEP](https://viacep.com.br/).

## Ativação

| Flag | Origem |
|---|---|
| `modules.geoapify.enabled` | Admin (`system_configs`) |
| `modules.geoapify.use_for_validation` | default `false` — toggle no admin |

Desabilitado → `503 MODULE_DISABLED`. 
Flag `use_for_validation=false` → `403 VALIDATION_DISABLED` em `POST /validate-address`.

## Prefixo

```
/api/v1/modules/geoapify
```

## Credenciais

Ver [credentials.md](./credentials.md). Campo: `api_key` (secret).

Cascata: `system_api_credentials` → env `GEOAPIFY_API_KEY`.

ViaCEP não exige credencial.

## Admin

Em **Serviços externos → Geoapify**:

1. Informar API Key e autenticar (teste = geocode leve BR).
2. Marcar **Usar na verificação de endereço**.

## Endpoints

### `GET /status`

```json
{
  "data": {
    "module": "geoapify",
    "enabled": true,
    "use_for_validation": true,
    "credentials_complete": true,
    "credentials_source": "db"
  }
}
```

### `POST /validate-address`

Request:

```json
{
  "text": "Rua X - 100 - Bairro - Cidade - UF - CEP",
  "address": {
    "street": "Rua X",
    "number": "100",
    "neighborhood": "Bairro",
    "city": "Cidade",
    "state": "GO",
    "cep": "74000000"
  },
  "order_id": 123,
  "force": false
}
```

- `text` opcional se `address` estiver completo (montado sem complemento).
- ViaCEP é consultado **no servidor**.
- Com `order_id`, persiste `orders.address_validation` = `válido` | `revisar` | `inválido`.
- Sem `force`, pedidos já validados retornam `{ skipped: true, status }`.

Response (formato de resposta):

```json
{
  "data": {
    "valid": true,
    "status": "válido",
    "reason": null,
    "matchedFormatted": "...",
    "confidence_street_level": 0.95,
    "cepValidatedBy": "viacep",
    "viacep": { "fetchOk": true, "cepExisteNaBaseCorreios": true, "cruzamento": {} }
  }
}
```

### `POST /test`

Valida a `api_key` com um geocode de teste.

## Consumo no Kunk

Listagem de pedidos: se o módulo estiver on + `use_for_validation`, valida automaticamente pedidos da página sem `address_validation`. 
Após editar endereço no modal de detalhes, revalida com `force: true`.
