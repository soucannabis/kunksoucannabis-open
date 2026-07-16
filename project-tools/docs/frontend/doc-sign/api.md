# Doc-sign — API (`kunk-api`)

> Prefixo: `/api/v1/doc-sign`
> Domínio **nativo** (não `/modules/*`). Substitui stubs `/terms/*`.

Envelope padrão: [`../../api/errors.md`](../../api/errors.md). Auth: cookie `associate_session` (associado) ou `session_token` (operador).

---

## Auth por rota

| Grupo | Quem |
|---|---|
| Templates (CRUD / publish) | Operador com role `Administrador` (ou permissão dedicada `doc_sign.manage`) |
| Contracts create (painel) | Operador staff (Acolhimento+) no `user_code` alvo |
| Contracts create (me) | Associado autenticado — só o próprio `user_code` |
| Sign / view by token | Público com `signing_token` válido **ou** associado dono |
| Verify | Staff ou associado dono |

---

## Templates

| Método | Path | Descrição |
|---|---|---|
| GET | `/doc-sign/templates` | Lista os 2 kinds + versão current |
| GET | `/doc-sign/templates/:kind` | Detalhe + `content_json` draft/current + versões |
| PUT | `/doc-sign/templates/:kind/draft` | Body `{ content_json }` (documento TipTap) |
| POST | `/doc-sign/templates/:kind/publish` | Versiona JSON, gera PDF, marca current |
| GET | `/doc-sign/templates/:kind/sample-variables` | Defaults fictícios editáveis p/ prévia |
| POST | `/doc-sign/templates/:kind/preview-pdf` | PDF de teste (não persiste); body `{ content_json?, variables? }` |
| GET | `/doc-sign/templates/:kind/versions` | Histórico |
| GET | `/doc-sign/templates/versions/:versionId` | JSON + PDF da versão |
| POST | `/doc-sign/templates/:kind/reset` | Zera o kind (versões, logo, rascunho → texto padrão) |

### `PUT …/draft`

```json
{ "content_json": { "type": "doc", "content": [ /* TipTap */ ] } }
```

### `POST …/publish`

Request: `{ notes?: string }`  
Response:

```json
{
  "data": {
    "template_id": "…",
    "kind": "self",
    "version": {
      "id": "…",
      "version_number": 3,
      "content_sha256": "…",
      "pdf_file_id": "…",
      "pdf_sha256": "…"
    }
  }
}
```

Erros: `TEMPLATE_INVALID_VARIABLES`, `PDF_RENDER_FAILED`.

---

## Contracts

| Método | Path | Descrição |
|---|---|---|
| POST | `/doc-sign/contracts` | Gera (ou reusa pending) contrato preenchido |
| GET | `/doc-sign/contracts` | Staff: lista recentes (`limit`, `offset`, `status`) |
| GET | `/doc-sign/contracts/:id` | Status, variáveis, urls de PDF |
| GET | `/doc-sign/contracts/me` | Contrato relevante do associado logado |
| GET | `/doc-sign/contracts/by-user/:userCode` | Staff: lista contratos do user |
| POST | `/doc-sign/contracts/:id/resend-email` | Reenvia link |
| POST | `/doc-sign/contracts/:id/void` | Anula pending (staff) |
| GET | `/doc-sign/contracts/:id/verify` | Recalcula e compara hashes |
| GET | `/doc-sign/contracts/:id/audit` | JSON do audit + link PDF |

### `POST /doc-sign/contracts`

```json
{
  "user_code": "uuid-opcional-se-me",
  "send_email": true,
  "regenerate": false,
  "replace_completed": false
}
```

`send_email` default **true** (omitido ou true): envia e-mail com `signing_url` ao criar/reusar pending. Após assinatura, envia confirmação com PDF assinado + audit log em anexo (se SMTP configurado).

Response:

```json
{
  "data": {
    "id": "uuid",
    "status": "pending",
    "kind": "with_patient",
    "signing_url": "https://termos.exemplo/assinar/…",
    "filled_pdf_url": "/api/v1/files/…",
    "variables": { }
  }
}
```

Regras:

- Se já existe contrato **`completed`** para o `user_code` ou o mesmo `email_account` → **409** `CONTRACT_ALREADY_COMPLETED`.
- Idempotente no cadastro: se existir `pending`, retorna o existente (`meta.reused: true`).
- Painel “Novo Termo” sem `completed`: pode void do `pending` anterior e criar novo.
- Escolhe `kind`: `another`+paciente → `with_patient`; `himself`\|`pet` → `self`.
- Emite `contract.created` e opcionalmente `email.sent`.
- Sem template publicado do kind → **422** `TEMPLATE_NOT_PUBLISHED`.

### Conclusão (assinatura)

| Método | Path | Descrição |
|---|---|---|
| GET | `/doc-sign/sign/:token` | Payload para a UI (`content_json` preenchido, título, métodos) |
| POST | `/doc-sign/sign/:token/view` | Registra `form.viewed` (+ IP, UA, session_id, timezone) |
| POST | `/doc-sign/sign/:token/complete` | Conclui assinatura |

#### `POST …/complete`

```json
{
  "method": "draw",
  "typed_name": null,
  "signature_image_base64": "data:image/png;base64,…",
  "timezone": "America/Sao_Paulo",
  "consent": true
}
```

Server:

1. Valida token / status pending  
2. `submission.started`  
3. Persiste `term_signatures` + imagem  
4. Gera PDF assinado + audit PDF + hashes  
5. `status=completed`, `submission.completed`  
6. **Integração cadastro (mesma API):**  
   - `users.adhesion_term = contract.id` (UUID)  
   - se `associate_status === 4` → `5`  
7. Retorna urls do PDF assinado e audit  

**Sem webhook.** Sem `session_id` no body nem no audit.

Erros: `CONTRACT_NOT_PENDING`, `CONTRACT_ALREADY_COMPLETED`, `TOKEN_INVALID`, `SIGNATURE_REQUIRED`, `CONSENT_REQUIRED`, `TEMPLATE_NOT_PUBLISHED`.

---

## Status (compatibilidade)

| Método | Path | Descrição |
|---|---|---|
| GET | `/doc-sign/status` | `{ status: "ready" }` quando módulo implementado |
| GET | `/terms/status` | **Alias deprecado** → mesmo handler (remove stubs 501) |
| POST | `/terms/contracts` | **Alias deprecado** → `POST /doc-sign/contracts` |

Durante a entrega, remover `TERMS_MODULE_IN_DEVELOPMENT` dos stubs.

---

## Metadados de auditoria em todo POST de view/complete

Capturar no server (não confiar só no client):

| Campo | Fonte |
|---|---|
| `ip` | `req` (X-Forwarded-For confiável atrás do proxy) |
| `user_agent` | header |
| `timezone` | body (IANA), default `UTC` se ausente |
| `occurred_at` | `now()` no server |

**Não** registrar `session_id`.

---

## Relação com cadastramento / painel

| Cliente | Uso |
|---|---|
| `apps/registration` fase 4 | `POST /doc-sign/contracts` (me) + embed/redirect `signing_url`; polling ou redirect pós-complete |
| `apps/kunk` Associados | Novo Termo / Copiar link via endpoints staff |
| `apps/doc-sign` | UI admin de templates + página `/assinar/:token` |

Detalhe de avanço de fase: [flow.md](./flow.md) §6.

---

## OpenAPI

Incluir paths em [`../../api/openapi.yaml`](../../api/openapi.yaml) na mesma entrega da implementação.
