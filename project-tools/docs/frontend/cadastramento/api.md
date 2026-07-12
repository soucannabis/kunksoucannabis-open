# Cadastramento — Requisitos de API

> Contrato para implementar **junto com** `apps/registration`.
> Decisões fechadas: [gaps.md](./gaps.md). Fases: [flow.md](./flow.md).
> Auth detalhada: [`../../api/authentication.md`](../../api/authentication.md).

## Princípio

Front só fala `/api/v1`. Sessão de **associado** via cookie **`associate_session`** (não misturar com `session_token` do painel).

---

## Auth de associado

| Método | Path | Notas |
|---|---|---|
| POST | `/auth/associate/register-email` | Body `{ email, password }` → user fase 1 + cookie (senha min. 8) |
| POST | `/auth/associate/login` | `{ email, password }` |
| POST | `/auth/associate/logout` | |
| GET | `/auth/associate/me` | Sem senha; fase, status, invalid_fields, patient link |
| POST | `/auth/associate/forgot-password` | `{ email }` → 200 genérico |
| POST | `/auth/associate/reset-password` | `{ token, password }` |

Ver [gaps.md](./gaps.md) §1–3 (bcrypt, cookie, reset).

---

## Users / funil

| Método | Path | Função |
|---|---|---|
| GET | `/users/exists?email=` | `{ exists, state: "none"\|"in_progress"\|"associado" }` |
| PATCH | `/users/me` | Persistência parcial do responsável |
| GET | `/users/me/patients` | Pacientes do responsável |
| POST | `/users/me/patients` | Cria paciente (parcial ou completo) |
| PATCH | `/users/me/patients/:id` | Persistência parcial do paciente |
| POST | `/users/me/advance` | Tenta avançar fase (server valida pré-condições) |

### PATCH parcial

```http
PATCH /users/me
Cookie: associate_session=…

{ "associate_name": "Ana", "associate_cpf": "000", "cep": "" }
```

**200**

```json
{
  "data": { "id": 1, "associate_status": 2, "invalid_fields": ["associate_cpf", "cep"], "…": "…" },
  "meta": {
    "saved_fields": ["associate_name"],
    "invalid_fields": ["associate_cpf", "cep"]
  },
  "errors": null
}
```

- **400** se nenhum campo conhecido no body.
- Server é fonte de verdade de `invalid_fields`.

### E-mail duplicado (register-email)

| Caso | HTTP | Código |
|---|---|---|
| Novo | 201 | — |
| Já Associado | 409 | `ACCOUNT_EXISTS` |
| Em andamento (fases 1–5) | 409 | `ACCOUNT_IN_PROGRESS` |

---

## Documentos (fase 3)

| Método | Path | Função |
|---|---|---|
| POST | `/files` | multipart + `doc_type`, `side`, `subject`, `doc_kind` |
| GET | `/users/me/documents/status` | O que falta para completar identidade |
| DELETE | `/files/:id` | Remover upload próprio na fase 3 |

Metadados: ver [gaps.md](./gaps.md) §4.

---

## Termos (fase 4) — módulo em desenvolvimento

**Não entregar assinatura real nesta fase.**

| Método | Path | Comportamento nesta entrega |
|---|---|---|
| POST | `/terms/contracts` | **501/503** `TERMS_MODULE_IN_DEVELOPMENT` |
| GET | `/terms/status` | `{ status: "module_in_development" }` |

Front: após docs OK, tela da fase 4 com mensagem de módulo em desenvolvimento.  
Não avançar para fase 5 por webhook. Bypass só com `TERMS_DEV_BYPASS=true` (QA).

Quando o módulo for implementado (entrega separada): gravar `adhesion_term`, `associate_status=5`, payload com **`user_code`**.

---

## Fase 5

| Uso | API |
|---|---|
| Receita | PATCH `prescription` +/ou file `doc_kind=prescription` |
| Laudo / exame | files `doc_kind=report\|exam` |
| Concluir | PATCH `status=Associado` (ou `POST /users/me/complete`) |

Acessível quando fase ≥ 5 (após módulo termos ou bypass QA).

---

## Guards

- Rotas de associado exigem cookie `associate_session`.
- Ações de fase anterior → **403** `PHASE_LOCKED` se `associate_status` já passou.
- Associado só acessa o próprio user / próprio paciente.

---

## Mapa legado → novo

| Legado | Novo |
|---|---|
| create-user + auth | `register-email` |
| update Directus | `PATCH /users/me` (+ patients) |
| user por code | `GET /auth/associate/me` |
| files / folder | `POST /files` + status |
| docuseal | stub `/terms/*` até módulo pronto |
| login/logout/me | `/auth/associate/*` |
| lost/redefine pass | forgot / reset |

## Erros

Envelope [`../../api/errors.md`](../../api/errors.md).  
Códigos novos: `ACCOUNT_EXISTS`, `ACCOUNT_IN_PROGRESS`, `PHASE_LOCKED`, `TERMS_MODULE_IN_DEVELOPMENT`.
