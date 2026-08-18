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
| `Profissional` | Portal de relatório de atendimentos; escopo `internal_code` = `professional_code`. Papel exclusivo, sem misturar com staff. |
| `api` | Reservado a tokens de integração |

Prescritor de receita (`is_prescriber` no cadastro de profissionais) **não** é usuário do sistema e não tem papel de login.

Os nomes podem permanecer compatíveis com o JSON atual de `permissions` no kunkserver.

## Matriz padrão (proposta v1)

| Collection | Admin | Acolhimento | Produção | Financeiro |
|---|---|---|---|---|
| `users` | CRUD | CRU | R | R |
| `system_users` | CRUD | R (limitado) | — | — |
| `orders` | CRUD | CRUD | RU | RU |
| `services` | CRUD | CRUD | — | RU |
| `products` | CRUD | R | RU | R |
| `professionals` | CRUD | RU | — | R |
| `reception` | CRUD | CRUD | — | — |
| `tags` | CRUD | CRUD | R | R |
| `reports` | CRUD | R | R | R |
| `files` / `*_files` | CRUD | CRUD | R | R |
| `users_api` / tokens | CRUD | — | — | — |

`R*` = leitura **escopada** ao próprio código (`Profissional`), não lista global.

Role `Profissional` (portal de serviços): ver [`../frontend/kunk/relatorios-servicos/api.md`](../frontend/kunk/relatorios-servicos/api.md) — `services` R* e `professionals` R* no próprio `professional_code` (`GET`/`PATCH` de domínio e `/items/professionals`). Sem `files` / `*_files`. `PATCH /professionals/:id/donation-balance` e `POST /professionals/:id/portal-access` (+ resend) são só staff.

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

Rotas admin de tokens (`/auth/tokens`), operadores (`POST/PATCH/DELETE /system-users`) e templates DocSign exigem sessão `Administrador` **ou** API key com scope `*`. Scope restrito não passa, mesmo com role `api`.

Mapeamento:

| Scope | Actions |
|---|---|
| `items:{c}:read` | read |
| `items:{c}:write` | create, update |
| `items:{c}:delete` | delete |
| `items:{c}:*` | CRUD |

## Regras de dados escopados

Além do RBAC de collection, aplicar **filtros obrigatórios** no repositório:

- Role `Profissional` → `WHERE services.professional_id = system_users.internal_code` (relatório de serviços)
- Role `Profissional` → `WHERE professionals.professional_code = system_users.internal_code` (cadastro do portal; `scopeFilterFor(..., 'professionals')`)
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
