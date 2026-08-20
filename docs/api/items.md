# CRUD genérico — `/items/:collection`

Interface CRUD genérica do de origem Items API. Cobre operações simples sobre collections da whitelist.

## Base

```
/api/v1/items/{collection}
```

`collection` deve estar na whitelist (ver [collections.md](./collections.md)). 
Case: **snake_case** do schema alvo (`orders`, `system_users`, …).

## Endpoints

### Listar

```http
GET /items/{collection}
```

Query: ver [query-parameters.md](./query-parameters.md).

**200**

```json
{
  "data": [ { "id": 1, "…" : "…" } ],
  "meta": {
    "filter_count": 12,
    "total_count": 100
  },
  "errors": null
}
```

`meta` só é preenchido se pedido via `meta=*` ou `meta=filter_count,total_count`.

### Obter por ID

```http
GET /items/{collection}/{id}
```

**200** — `data` é um objeto. 
**404** — `NOT_FOUND`.

### Criar

```http
POST /items/{collection}
Content-Type: application/json
```

```json
{
  "name": "Exemplo",
  "status": "active"
}
```

**201**

```json
{
  "data": { "id": 42, "name": "Exemplo", "status": "active" },
  "meta": null,
  "errors": null
}
```

Campos auto (`id`, `date_created`) gerados pelo servidor. 
Campos sensíveis de sessão (`session_token`, etc.) são ignorados no write (exceto `password` / `account_password` / `token` onde aplicável). 
Campos **desconhecidos** (fora do schema da collection, ex. campos removidos anteriores) → **400** `VALIDATION_ERROR` com `details.unknown_fields`.

### Atualizar (parcial)

```http
PATCH /items/{collection}/{id}
```

```json
{ "status": "inactive" }
```

**200** — item atualizado. 
Só campos enviados são alterados. Chaves fora do schema → **400**.

### Remover

```http
DELETE /items/{collection}/{id}
```

**204** sem body, ou **200** com `{ "data": { "id": 42 } }` (definir um padrão e manter).

Proposta: **204** para delete simples.

### Criar / atualizar em lote (fase 2)

```http
POST  /items/{collection}     # body: array → create many
PATCH /items/{collection}     # body: array com id → update many
```

Opcional na v1; priorizar item único.

## Whitelist e segurança

1. Collection desconhecida → **404** `UNKNOWN_COLLECTION` (não revelar existência de tabelas internas)
2. Collection conhecida sem permissão → **403** `FORBIDDEN`
3. Filtros/sort só em colunas conhecidas do schema da collection
4. `fields` só colunas permitidas; senão ignorar ou 400
5. Write: só colunas do schema; campo desconhecido → **400** `VALIDATION_ERROR`
6. FK inválida (UUID inexistente na tabela relacionada) → **400** `VALIDATION_ERROR`
7. Unique violation → **409** `CONFLICT`
8. Limite máximo de `limit` (ex.: 250); default 25
9. Sem raw SQL, sem `select *` implícito em campos sensíveis

## Quando **não** usar `/items`

Usar rotas de domínio ([domain-routes.md](./domain-routes.md)) quando houver:

- Side effects (estoque, pagamento, comissão, WhatsApp)
- Transações multi-tabela
- Validações de negócio complexas
- Payloads que não mapeiam 1:1 para uma linha

Exemplos: criar pedido completo, agendar serviço com profissional, login.

