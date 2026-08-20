# Query parameters

Aplicáveis principalmente a `GET /items/:collection` e a listagens de domínio.

## Parâmetros

| Param | Tipo | Default | Descrição |
|---|---|---|---|
| `filter` | object (query) | — | Filtros da API Kunk |
| `sort` | string / array | `-id` ou `id` | Ordenação |
| `limit` | int | `25` | Máx. por página (cap server-side) |
| `offset` | int | `0` | Paginação offset |
| `page` | int | — | Alternativa a offset (`page` 1-based) |
| `fields` | string | `*` seguro | Colunas a retornar |
| `search` | string | — | Busca full-text / icontains em campos indexados |
| `meta` | string | — | Metadados: `filter_count`, `total_count`, `*` |

## Filter (da API Kunk)

### Operadores suportados (v1)

| Operador | Significado |
|---|---|
| `_eq` | igual |
| `_neq` | diferente |
| `_in` | lista |
| `_nin` | não está na lista |
| `_null` | é null (bool) |
| `_nnull` | não é null |
| `_lt` `_lte` `_gt` `_gte` | comparação |
| `_contains` | substring (case-sensitive) |
| `_icontains` | substring case-insensitive |
| `_starts_with` / `_istarts_with` | prefixo |
| `_between` | intervalo `[min, max]` |
| `_and` / `_or` | composição |

### Exemplos

```http
GET /items/orders?filter[status][_eq]=Pagamento%20concluído
GET /items/orders?filter[prescriber_code][_eq]=uuid-aqui
GET /items/users?filter[associate_name][_icontains]=silva
GET /items/orders?filter[_and][0][status][_eq]=x&filter[_and][1][date_created][_gte]=2026-01-01
```

JSON em query (alternativa, se o client preferir):

```http
GET /items/orders?filter={"status":{"_eq":"Produção Finalizada"}}
```

O servidor deve aceitar **um** formato canônico na v1 (recomendado: estilo de query aninhada) e documentar o outro como opcional.

## Sort

```http
GET /items/orders?sort=-date_created
GET /items/orders?sort=status,-id
```

- Prefixo `-` = descendente
- Múltiplos campos separados por vírgula

## Fields

```http
GET /items/users?fields=id,associate_name,user_code,status
```

- Sem `fields` → conjunto default (sem campos sensíveis)
- `fields=*` → todos os campos **não sensíveis**

## Include (relações)

Expande objetos relacionados em rotas de domínio (e listagens que suportam o param).

```http
GET /services?include=professional,associate
GET /users?include=responsible
GET /users/by-code/:user_code?include=responsible
```

| Collection | Chaves `include` | Join |
|---|---|---|
| `services` | `professional` | `professional_id` → `professionals.professional_code` |
| `services` | `associate` | `associate_user_code` → `users.user_code` |
| `users` | `responsible` | `responsible_code` → `users.user_code` |

Chave desconhecida → `400 VALIDATION_ERROR`.

## Patients (users)

```http
GET /users?patients
GET /users/by-code/:user_code?patients
```

Embute array `patients` nos associados (`WHERE responsible_code = user.user_code`). Pacientes retornam `patients: []`.

A presença do param liga o embed (`?patients` ou `?patients=`). Use `patients=false` para desligar explicitamente.

## Meta

```http
GET /items/orders?meta=filter_count,total_count
GET /items/orders?meta=*
```

| Meta | Significado |
|---|---|
| `filter_count` | total após filter (sem limit) |
| `total_count` | total da collection (sem filter) |

## Paginação

```http
GET /items/orders?limit=50&offset=100
GET /items/orders?limit=50&page=3
```

Se `page` e `offset` forem enviados juntos: `page` vence, ou retornar 400.

## Search

```http
GET /items/users?search=maria
```

Aplica `_icontains` em um conjunto fixo de colunas por collection (ex.: `users` → `associate_name`, `fullname`, `email_account`, `associate_cpf`).

## Limites e erros

| Situação | Resposta |
|---|---|
| `limit` > max | clamp ou 400 `VALIDATION_ERROR` |
| Campo de filter inválido | 400 |
| Operador não suportado | 400 |
| Sort em coluna inexistente | 400 |
| `include` inválido | 400 |

## Implementação

- Traduzir filter → SQL parametrizado (`WHERE` + binds)
- Nunca concatenar valores crus
- Índices no Postgres para colunas filtradas com frequência (`user_code`, `status`, `prescriber_code`, …)
- `include` / `patients`: batch load (sem N+1)
