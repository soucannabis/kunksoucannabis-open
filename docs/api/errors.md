# Erros

## Envelope

Toda resposta de erro segue:

```json
{
  "data": null,
  "meta": null,
  "errors": [
    {
      "code": "FORBIDDEN",
      "message": "Sem permissão para update em orders",
      "details": null
    }
  ]
}
```

`details` pode carregar campos de validação:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Payload inválido",
  "details": {
    "email": ["obrigatório"],
    "limit": ["deve ser <= 250"]
  }
}
```

## Códigos

| Código | HTTP | Uso |
|---|---:|---|
| `VALIDATION_ERROR` | 400 | Body/query inválidos, campos desconhecidos, FK inexistente, formato inválido |
| `UNAUTHORIZED` | 401 | Sem sessão/token ou inválido |
| `FORBIDDEN` | 403 | Autenticado sem permissão |
| `NOT_FOUND` | 404 | Recurso inexistente |
| `UNKNOWN_COLLECTION` | 404 | Collection fora da whitelist |
| `CONFLICT` | 409 | Estado incompatível (status, unique) |
| `RATE_LIMITED` | 429 | Rate limit |
| `MODULE_DISABLED` | 503 | Módulo opt-in desligado |
| `INTERNAL_ERROR` | 500 | Erro inesperado |

### Validação de write

Campos fora do schema da collection:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Campos desconhecidos no payload",
  "details": { "unknown_fields": ["legacy_field", "delivery_problem"] }
}
```

Violação de foreign key (ex.: `professional_id` apontando para UUID inexistente):

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Referência inválida: valor não existe na tabela relacionada",
  "details": {
    "constraint": "fk_services_professional_id",
    "table": "services",
    "detail": "..."
  }
}
```

## Boas práticas

1. Não vazar stack traces em produção
2. Logar `request_id` / correlation id
3. Mensagens em português para o produto BR (ou i18n depois)
4. Mesmo envelope em sucesso e erro (`errors: null` no sucesso)
