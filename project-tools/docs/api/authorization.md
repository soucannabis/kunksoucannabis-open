# Autorização (RBAC)

Toda rota autenticada passa por autorização baseada em **role** (sessão) ou **scopes** (API key).

## Conceitos

| Conceito | Descrição |
|---|---|
| **Role** | Papel do usuário de sessão (`system_users.permissions`) |
| **Action** | `create`, `read`, `update`, `delete` |
| **Collection** | Tabela whitelist (`users`, `orders`, …) |
| **Scope** | String de API key (`items:orders:read`) |
| **Field policy** | Campos ocultos/readonly por role (fase 2) |

## Roles iniciais (alinhadas ao produto atual)

| Role | Uso típico |
|---|---|
| `Administrador` | Acesso total |
| `Acolhimento` | Reception, users, services, orders (operacional) |
| `Produção` | Orders (produção), products |
| `Financeiro` | Orders/services (leitura + validação comissão) |
| `Prescritor` | Relatórios / dados do próprio `prescriber_code` (pedidos — fora do módulo de serviços v1) |
| `Profissional` | Portal de relatório de serviços; escopo `internal_code` = `professional_code` |
| `api` | Reservado a tokens de integração |

Os nomes podem permanecer compatíveis com o JSON atual de `permissions` no kunkserver.

## Matriz padrão (proposta v1)

| Collection | Admin | Acolhimento | Produção | Financeiro | Prescritor |
|---|---|---|---|---|---|
| `users` | CRUD | CRU | R | R | — |
| `system_users` | CRUD | R (limitado) | — | — | — |
| `orders` | CRUD | CRUD | RU | RU | R* |
| `services` | CRUD | CRUD | — | RU | R* |
| `products` | CRUD | R | RU | R | — |
| `professionals` | CRUD | RU | — | R | R* |
| `reception` | CRUD | CRUD | — | — | — |
| `tags` | CRUD | CRUD | R | R | — |
| `reports` | CRUD | R | R | R | R* |
| `files` / `*_files` | CRUD | CRUD | R | R | — |
| `users_api` / tokens | CRUD | — | — | — | — |

`R*` = leitura **escopada** ao próprio código (`Prescritor` / `Profissional`), não lista global.

Role `Profissional` (portal de serviços): ver [`../frontend/kunk/relatorios-servicos/api.md`](../frontend/kunk/relatorios-servicos/api.md) — tipicamente `services` R*, `professionals` R* (próprio), sem CRUD staff.

## Middleware

```
authenticate → authorize(collection, action) → handler
```

Para rotas de domínio:

```
authorizeDomain("orders.create")
```

## API keys e scopes

Exemplos:

```
items:users:read
items:orders:read
items:orders:write   # create+update
items:orders:delete
files:write
modules:pagarme
*                    # admin token (evitar em produção)
```

Mapeamento:

| Scope | Actions |
|---|---|
| `items:{c}:read` | read |
| `items:{c}:write` | create, update |
| `items:{c}:delete` | delete |
| `items:{c}:*` | CRUD |

## Regras de dados escopados

Além do RBAC de collection, aplicar **filtros obrigatórios** no repositório:

- Role `Prescritor` → `WHERE prescriber_code = …` (pedidos; fora do relatório de serviços v1)
- Role `Profissional` → `WHERE services.professional_id = system_users.internal_code` (relatório de serviços)
- Tokens com scope restrito → mesmo princípio se o token estiver vinculado a um parceiro

Isso evita vazamento mesmo se o cliente omitir o filter.

## Campos sensíveis

Nunca retornar por padrão (e nunca aceitar em PATCH sem role admin):

- `password`, `account_password`
- `session_token`, `session_expires`
- `utalk_token`
- hashes de API token

Usar `fields` allowlist por collection + strip no serializer.

## Resposta 403

```json
{
  "data": null,
  "meta": null,
  "errors": [
    {
      "code": "FORBIDDEN",
      "message": "Sem permissão para update em orders"
    }
  ]
}
```
