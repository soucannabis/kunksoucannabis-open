# Admin — Requisitos de API

> Contrato para implementar **junto com** `apps/admin` (ou imediatamente antes).
> Decisões: [gaps.md](./gaps.md). Fluxo: [flow.md](./flow.md).
> Auth base: [`../../api/authentication.md`](../../api/authentication.md) · RBAC: [`../../api/authorization.md`](../../api/authorization.md).

## Princípio

Front só fala `/api/v1`. Sessão de **operador** via cookie **`session_token`**.  
Todas as rotas abaixo (exceto login) exigem sessão + role **`Administrador`** (403 `FORBIDDEN` caso contrário).

---

## Auth (já existente — reusar)

| Método | Path | Notas |
|---|---|---|
| POST | `/auth/login` | `{ email, password }` → cookie `session_token` |
| POST | `/auth/logout` | Invalida sessão |
| GET | `/auth/me` | Operador sem senha; inclui `permissions` |

O front admin, após `/auth/me`, verifica `permissions.includes('Administrador')`.  
A API também deve **autorizar** mutações admin (configs, CRUD amplo) só para essa role — não confiar só no front.

---

## Dados — CRUD genérico

Já documentado em [`../../api/items.md`](../../api/items.md) e [`../../api/collections.md`](../../api/collections.md).

| Método | Path | Uso no admin |
|---|---|---|
| GET | `/items/:collection` | Lista + filtros |
| GET | `/items/:collection/:id` | Detalhe |
| POST | `/items/:collection` | Criar |
| PATCH | `/items/:collection/:id` | Atualizar |
| DELETE | `/items/:collection/:id` | Excluir |

### Necessário para o admin (gaps de API)

| Item | Motivo |
|---|---|
| Whitelist completa alinhada ao schema alvo | Browser de dados |
| `include` / metadados de FK por collection | Navegação de relações na UI |
| Endpoint ou schema introspectável das colunas | Gerar formulários (pode ser estático no front a partir de `packages/` espelhando `collections.js`) |
| Hash de senha em write de `system_users.password` / `users.account_password` | Já esperado no items service |
| Strip de campos sensíveis no read | Lista/detalhe seguros |

Opcional (nice-to-have na mesma entrega):

```http
GET /admin/schema
```

Retorna lista de collections + colunas + FKs conhecidas (só Administrador). Evita duplicar schema só no front.

---

## Arquivos

| Método | Path | Uso |
|---|---|---|
| GET | `/files` | Lista (se ainda não existir listagem paginada — **entregar com o admin**) |
| GET | `/files/:id` | Metadados |
| GET | `/files/:id/download` | Download / preview |
| POST | `/files` | Upload |
| DELETE | `/files/:id` | Remover |
| POST | `/files/:id/attach` (ou equivalente) | Vincular a user/order/service via junction |

Detalhe: [`../../api/files.md`](../../api/files.md). Se `GET /files` (lista) não existir, incluir na entrega do admin.

---

## System configs (admin)

Hoje só existe `GET /config/public` (não sensível). O admin precisa de superfície autenticada.

| Método | Path | Função |
|---|---|---|
| GET | `/config/systems` | Lista distintos `system` + contagem de keys |
| GET | `/config?system=` | Todas as keys do sistema **resolvidas** (source, flags); sensíveis: máscara ou valor só se policy permitir |
| GET | `/config/:id` | Uma row |
| PATCH | `/config/:id` | Atualiza `value` (e metadados permitidos); se `is_sensitive`, criptografa com `CONFIG_ENCRYPT_KEY` |
| POST | `/config` | Cria key (`system`, `key`, flags, `hardcoded_default`, …) |
| DELETE | `/config/:id` | Remove key (cuidado: só se não for seed obrigatório — ou soft: clear value) |
| POST | `/config/:id/clear` | Zera `value` no DB (volta cascata env/hardcoded) |

### Resposta de item (exemplo)

```json
{
  "data": {
    "id": 1,
    "system": "registration",
    "key": "VITE_ASSOCIATION_NAME",
    "value": "Sou Cannabis",
    "resolved_value": "Sou Cannabis",
    "source": "db",
    "value_type": "string",
    "is_sensitive": false,
    "is_required": false,
    "allow_hardcoded": true,
    "hardcoded_default": "Kunk",
    "description": "Nome da associação exibido no cadastramento"
  },
  "meta": null,
  "errors": null
}
```

Para `is_sensitive: true`:

- Read: `value` / `resolved_value` como `null` ou `"********"`; flag `has_value: true|false`
- Write: body `{ "value": "novo-segredo" }` → server criptografa e grava

### Autorização

Só `Administrador`. Não expor via `/items/system_configs` no MVP se a criptografia/máscara não estiver no items layer — preferir rotas `/config/*` acima.  
Se incluir na whitelist de items depois, manter as mesmas regras de strip/encrypt.

---

## Operadores (usuários do admin / painel)

Rotas de domínio já previstas em [`../../api/domain-routes.md`](../../api/domain-routes.md):

| Método | Path | Função |
|---|---|---|
| GET | `/system-users` | Listar |
| POST | `/system-users` | Criar (hash senha) |
| GET | `/system-users/:id` | Detalhe |
| PATCH | `/system-users/:id` | Atualizar (incl. `permissions`, `status`) |
| DELETE | `/system-users/:id` | Excluir (ou 405 se só desativar) |

Equivalente via `/items/system_users` é aceitável se o service:

1. Hashear `password` no write
2. Nunca devolver `password` / `session_token` / `utalk_token`
3. Impedir remover o último `Administrador` ativo
4. Impedir que o usuário tire a própria role `Administrador` se for o único

### Body criar / editar (exemplo)

```json
{
  "name": "Ana",
  "last_name": "Silva",
  "email": "ana@associacao.org",
  "password": "••••••••",
  "permissions": ["Administrador", "Acolhimento"],
  "status": "active",
  "internal_code": "ANA01"
}
```

`permissions` sempre array JSON no wire; persistência alinhada ao que a API já usa (`JSON.stringify` / parse).

### Roles conhecidas (read-only no MVP)

```http
GET /admin/roles
```

```json
{
  "data": [
    { "id": "Administrador", "description": "Acesso total + app admin" },
    { "id": "Acolhimento", "description": "Painel operacional" },
    { "id": "Produção", "description": "…" },
    { "id": "Financeiro", "description": "…" },
    { "id": "Parceiro", "description": "…" },
    { "id": "Prescritor", "description": "…" }
  ]
}
```

Pode ser constante no server espelhando `rbac.js` — não precisa de tabela no MVP.

---

## CORS / cookie

Incluir origem do admin (ex. `https://admin.exemplo.ong.br` ou `http://localhost:4256`) em:

- CORS allowlist da `kunk-api`
- `Domain` do cookie quando cross-subdomain (raiz da associação)

Mesmo cookie `session_token` do painel.

---

## Erros relevantes

| HTTP | Código | Quando |
|---|---|---|
| 401 | `UNAUTHORIZED` | Sem sessão |
| 403 | `FORBIDDEN` | Sessão ok, sem `Administrador` |
| 404 | `NOT_FOUND` | Collection/id/config inexistente |
| 409 | `LAST_ADMIN` | Tentativa de remover/desativar o último Administrador |
| 400 | `VALIDATION_ERROR` | Body inválido / unknown fields |
