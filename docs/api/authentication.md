# Autenticação

A API possui **três** canais de autenticação (um por request).

| Canal | Cliente | Credencial | Persistência |
|---|---|---|---|
| **Sessão operador** | Painel e **Admin** | Cookie `kunk_oss_session` | `system_users` |
| **Sessão associado** | Cadastramento | Cookie **`associate_session`** | `users` |
| **API Key** | Scripts, webhooks, apps externos | `Authorization: Bearer <token>` | `users_api` / `api_tokens` |

O app **admin** (`admin.` / `:4256`) reusa a sessão operador; o front e as rotas admin exigem role **`Administrador`**. Ver [`../frontend/admin/`](../frontend/admin/).

---

## 1. Sessão operador (painel)

### Cookie

| Atributo | Valor |
|---|---|
| Nome | `kunk_oss_session` |
| HttpOnly | `true` |
| Secure | `true` (produção) |
| SameSite | `Lax` |
| Path | `/` |
| Max-Age | alinhado a `session_expires` (ex.: 168h / 1 semana, sliding) |

O frontend **não** deve ler o token via JavaScript.

### Endpoints

#### `POST /auth/login`

Autentica operador interno (`system_users`).

**Body**

```json
{
  "email": "user@example.com",
  "password": "••••••••"
}
```

**Resposta 200**

```json
{
  "data": {
    "user": {
      "id": 1,
      "user_code": "…",
      "name": "…",
      "last_name": "…",
      "email": "…",
      "permissions": ["Administrador"],
      "internal_code": "…"
    }
  },
  "meta": null,
  "errors": null
}
```

Seta cookie `kunk_oss_session`. Senha com bcrypt. Nunca retornar `password` / `session_token` no body.

**Erros:** 400 `VALIDATION_ERROR` · 401 `INVALID_CREDENTIALS` · 403 `USER_INACTIVE` · 429 `RATE_LIMITED` (5 falhas / 5 min por IP+e-mail; teto 30 falhas / 5 min por IP. Acertos não contam.)

#### `POST /auth/logout`

Invalida a sessão atual do operador.

#### `GET /auth/me`

Retorna o operador autenticado. **401** se cookie inválido/expirado.

### Validação (middleware operador)

1. Ler cookie `kunk_oss_session`
2. Buscar `system_users` com token ativo
3. Verificar expiração / inatividade
4. `req.auth = { type: "session", subject: "operator" }`

---

## 1b. Sessão associado (cadastramento)

> Implementar **junto com** o app de cadastramento.  
> Detalhe: [`../frontend/cadastramento/gaps.md`](../frontend/cadastramento/gaps.md) · [`../frontend/cadastramento/api.md`](../frontend/cadastramento/api.md).

### Cookie

| Atributo | Valor |
|---|---|
| Nome | **`associate_session`** |
| HttpOnly / Secure / SameSite / Path | iguais ao operador |
| Domain | raiz da associação (cross-subdomain se necessário) |

Separado de `kunk_oss_session` (operador) para não colidir painel × cadastro. O nome `session_token` fica reservado ao Kunk legado.

### Endpoints

| Método | Path | Função |
|---|---|---|
| POST | `/auth/associate/register-email` | `{ email, password }` → cria fase 1 + cookie (senha min. 8) |
| POST | `/auth/associate/login` | `{ email, password }` |
| POST | `/auth/associate/logout` | |
| GET | `/auth/associate/me` | responsável sem senha |
| POST | `/auth/associate/forgot-password` | `{ email }` → 200 genérico; envia link se SMTP ok |
| POST | `/auth/associate/reset-password` | `{ token, password }` — invalida sessões do associado |

- Credenciais: `users.email_account` + `users.account_password` (bcrypt).
- Sessão: `users.session_*`.
- Reset: token opaco, TTL 1h, colunas `password_reset_token` / `password_reset_expires` (armazenar **hash** do token). Rate limit por IP+e-mail.
- Register: 409 `ACCOUNT_EXISTS` / `ACCOUNT_IN_PROGRESS` — ver api do cadastramento.

### Operador — reset de senha

| Método | Path | Função |
|---|---|---|
| POST | `/auth/forgot-password` | `{ email, app: "kunk"\|"admin"\|"doc-sign" }` → 200 genérico |
| POST | `/auth/reset-password` | `{ token, password }` (política: 8+, maiúscula, especial) |

Link do e-mail aponta para `{URL_DO_APP}/nova-senha?token=…`. Colunas `system_users.password_reset_*`. SQL: `alter-system-users-password-reset.sql`.

### Convite de operador

| Método | Path | Função |
|---|---|---|
| GET | `/auth/system-invite/preview` | Preview público do token |
| POST | `/auth/system-invite/accept` | Define senha e ativa usuário `pending` |
| POST | `/system-users` | Admin cria operador **sem senha** (`pending`) + envia convite |
| POST | `/system-users/:id/resend-invite` | Reenvia convite |

### Validação (middleware associado)

1. Ler cookie `associate_session`
2. Buscar `users` com token ativo (login não é registro `status=patient`)
3. `req.auth = { type: "session", subject: "associate" }`
4. Escopo: próprio user + pacientes vinculados

---

## 2. API Key (Bearer)

### Header

```http
Authorization: Bearer kunk_live_xxxxxxxx
```

### Modelo de dados (proposta)

Evoluir `users_api`:

| Campo | Tipo | Nota |
|---|---|---|
| `id` | serial | PK |
| `name` | text | rótulo |
| `token_hash` | text | hash (nunca plaintext) |
| `token_prefix` | text | identificação |
| `scopes` | jsonb | escopos |
| `expires_at` / `revoked_at` / `last_used_at` | timestamptz | |

Na criação, retornar o token **uma vez** em plaintext.

```http
POST   /auth/tokens
GET    /auth/tokens
DELETE /auth/tokens/:id
```

### Validação Bearer

1. Extrair Bearer → verificar hash / revoked / expires  
2. `req.auth = { type: "api_key", scopes }`  

Escopos: ver [authorization.md](./authorization.md).

---

## 3. Regras de segurança

1. Senhas e API tokens sempre hasheados  
2. Cookies HttpOnly; sem token no `localStorage`  
3. Rate limit em login / register-email / forgot-password  
4. CORS restrito às origens do painel/cadastro  
5. HTTPS em produção  
6. Não logar senhas/cookies/Bearer  
7. Um request: Bearer **ou** cookie operador **ou** cookie associado  

---

## 4. Compatibilidade com o kunkserver atual

| Atual | Novo |
|---|---|
| `POST /api/auth/login` + cookie | `POST /api/v1/auth/login` (operador) |
| Cookie em `Kunk_Users` | `system_users` + `session_token` |
| Login associado legado | `/auth/associate/*` + `associate_session` |
| `API_TOKEN` + plaintext | Bearer com hash + escopos |
