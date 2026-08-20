# Search global — API

## `GET /search`

Auth: operador. Rate-limit recomendado.

### Query

| Param | Tipo | Default | Notas |
|---|---|---|---|
| `entity` | string | — | `users` · `orders` · `services` · `reception` (**obrigatório**) |
| `q` | string | — | Obrigatório; max ~200 chars |
| `page` | int | 1 | |
| `limit` | int | 50–100 | Cap 100 |
| `sortField` | string | por entity | Whitelist |
| `sortDir` | `asc`\|`desc` | `desc` | |
| `ordersMode` | `name`\|`tracking` | `name` | Só `entity=orders` |

### Whitelist de sort (sugestão)

| entity | campos |
|---|---|
| `users` | `created_date`, `fullname`, `associate_name`, `associate_last_name`, `email_account`, `mobile_number`, `status` |
| `orders` | `created_date`, `associate_name`, `tracking_code`, `status`, `order_code`, `total` |
| `services` | `consultation_date`, `date_created`, `associate_name`, `professional_name` |
| `reception` | `date_created`, `name`, `last_name`, `email`, `phone`, `status`, `associate_name` |

### Resposta

```json
{
  "data": [ /* rows */ ],
  "meta": {
    "page": 1,
    "limit": 100,
    "total": 42
  }
}
```

### `gs_meta` (entity=users)

Cada row de users pode incluir:

```json
{
  "gs_meta": {
    "open_user_code": "uuid-do-responsavel",
    "display_status": "Associado",
    "display_email": "…",
    "display_phone": "…",
    "display_created": "2026-01-01T…",
    "display_name_blocks": [
      { "label": "Responsável", "name": "…" },
      { "label": "Paciente", "name": "…" }
    ]
  }
}
```

### Regras de filtro (resumo)

Implementar no Postgres (ILIKE / unaccent se disponível):

- **users:** `@` → email; só dígitos longos → telefone; senão nome
- **orders name:** ILIKE em nome do associado do pedido
- **orders tracking:** normalizar alfanumérico; Loggi 8 letras = eq; senão icontains
- **services:** ILIKE `associate_name`
- **reception:** ILIKE name/last_name/full_name

Não expor campos sensíveis (`account_password`, tokens).

### Erros

| Código | Quando |
|---|---|
| 400 | `entity` inválida, `q` vazio |
| 401/403 | Sem sessão / sem RBAC de leitura da collection |
