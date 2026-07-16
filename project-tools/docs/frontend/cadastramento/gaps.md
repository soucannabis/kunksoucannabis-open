# Cadastramento — Gaps e decisões

> Todas as decisões abaixo estão **fechadas** para implementação **junto com o cadastramento**.
> Única exceção de entrega: **módulo de assinatura de termos** (fase 4 real) — depois; no cadastro aparece como *em desenvolvimento*.

## Decisões de produto (já fechadas)

| Tema | Decisão |
|---|---|
| `met_us` / `bvid` / `proof_of_address` | Não usar |
| `contract` | `adhesion_term` |
| Encerramento | Responsável: `Associado`. Filho: `patient` |
| Progresso | `associate_status` **1–5** + guards + menu |
| `invalid_fields` | Lista de campos inválidos (não é fase) |
| Persistência parcial | Só grava campos válidos |
| CIAP2 | Associado e paciente → `ciap_codes` + texto |
| Documentos | Assistente RG (frente+verso) / CNH (frente); termo só após todos |
| `prescription` | ex-`medical_prescription` |
| Cadastro | Sempre por um **responsável** |

---

## Decisões técnicas (fechadas — implementar com o cadastramento)

### 1. Auth de associado

Implementar na `kunk-api` **na mesma entrega** do app `registration`.

| Endpoint | Comportamento |
|---|---|
| `POST /auth/associate/register-email` | Cria `users` com `email_account` + `account_password` (bcrypt, min. 8), `associate_status=1`; seta cookie; retorna user |
| `POST /auth/associate/login` | Valida `email_account` + `account_password` (bcrypt); cookie |
| `POST /auth/associate/logout` | Invalida sessão do associado |
| `GET /auth/associate/me` | User sem senha; inclui `associate_status`, `status`, `invalid_fields`, vínculos paciente |
| `POST /auth/associate/forgot-password` | Gera token; envia e-mail |
| `POST /auth/associate/reset-password` | Consome token; atualiza hash |

- Sessão persistida em **`users`**: `session_token`, `session_expires`, `last_activity`, `is_session_active`.
- Hash: **bcrypt** (mesmo padrão do operador). Senhas legadas em texto: no primeiro login bem-sucedido com match texto, rehash (ou script de migração separado).
- Spec canônica também em [`../../api/authentication.md`](../../api/authentication.md).

### 2. Cookie associado vs operador

| Cliente | Nome do cookie |
|---|---|
| Painel (operador) | `session_token` (mantém) |
| Cadastramento (associado) | **`associate_session`** |

- Ambos: HttpOnly, Secure (prod), SameSite=Lax, Path=`/`, Domain=raiz da associação quando cross-subdomain.
- Middleware distingue pelo cookie presente + tabela (`system_users` vs `users`).
- Evita colisão entre painel e cadastro no mesmo browser.

### 3. Reset de senha

| Item | Decisão |
|---|---|
| Token | Opaco (random 32+ bytes, hex/base64url); **nunca** AES no Vite |
| Armazenamento | Colunas em `users`: `password_reset_token` (hash do token), `password_reset_expires` — ou tabela `password_resets`; preferir **colunas em `users`** no MVP |
| TTL | **1 hora**, uso único |
| E-mail | Link `{REGISTRATION_PUBLIC_URL}/nova-senha?token=...` via módulo SMTP (`MODULE_EMAIL_ENABLED`) |
| Resposta forgot | Sempre 200 genérico (não revelar se e-mail existe) |

Incluir migration SQL das colunas na entrega do cadastramento.

### 4. Modelo de arquivos do assistente

Usar **`files` + `users_files`** com metadados no junction (ou JSON em `files`):

| Metadado | Valores |
|---|---|
| `doc_type` | `rg` \| `cnh` |
| `side` | `front` \| `back` (`back` só se `rg`) |
| `subject` | `responsible` \| `patient` |
| `doc_kind` | `identity` (fase 3) \| `prescription` \| `report` \| `exam` (fase 5) |

Endpoints (junto com o cadastro):

| Método | Path | Função |
|---|---|---|
| `POST /files` | upload + metadados + vínculo ao user da sessão |
| `GET /users/me/documents/status` | completude fase 3 (o que falta por subject/tipo) |
| `DELETE /files/:id` | remove se ainda na fase 3 e dono |

Regra de completude fase 3:

- Responsável: se `rg` → front+back; se `cnh` → front.
- Se `another`: mesma regra para `subject=patient`.
- Só então a UI oferece “avançar para assinatura” (fase 4).

### 5. Módulo de termos (fase 4) — **spec pronta; implementação pendente**

Assinatura real: app **`apps/doc-sign`** + API `/doc-sign/*`.  
Documentação: [`../doc-sign/`](../doc-sign/README.md).

**Nesta entrega do cadastramento** (já feita): stubs 501 + UI “em desenvolvimento”.

Quando o módulo for implementado:

- Endpoints reais em `/doc-sign/*` (aliases `/terms/*`)
- Gerar contrato → assinar → gravar `adhesion_term` (`term_contracts.id`) → `associate_status=5`
- Payload com **`user_code`** (UUID)
- **Sem webhook** — handler interno na `kunk-api` (mesma API do cadastro)

Até lá:

- Após docs completos, `associate_status` pode ir a **4**
- Tela da fase 4 informa módulo em desenvolvimento
- Endpoints stub → **501** `TERMS_MODULE_IN_DEVELOPMENT`
- **Não** avançar automaticamente para fase **5** (sem webhook falso)
- `adhesion_term` permanece vazio

Opcional só para QA interno (não produção): env `TERMS_DEV_BYPASS=true` permite ir 4→5 sem assinatura. Default **false**.

### 6. PATCH parcial + `invalid_fields`

| Item | Decisão |
|---|---|
| Body | Objeto com campos tentados do form (nomes do schema novo) |
| Server | Revalida cada campo; persiste só válidos; recalcula `invalid_fields` |
| Sucesso | **200** + `{ data: user, meta: { saved_fields: [], invalid_fields: [] } }` |
| Body vazio / só desconhecidos | **400** `VALIDATION_ERROR` |
| Avanço de fase | Só se `invalid_fields` vazio **e** regras da etapa OK (ex. paciente completo se `another`) |

Client e server validam; **server é a fonte de verdade** de `invalid_fields`.

### 7. Hidratação do form

| Item | Decisão |
|---|---|
| Fonte ao abrir fase 2 | `GET /auth/associate/me` (+ paciente via `GET /users/me/patients` se `another`) |
| Senha | Nunca no GET; campo senha sempre vazio na UI |
| localStorage | Cache opcional de rascunho; se API tiver dados, **API vence** |
| Após PATCH 200 | Atualizar form com `data` da resposta |

### 8. Paciente — API

| Método | Path | Função |
|---|---|---|
| `POST /users/me/patients` | Cria paciente (`status=patient`, `responsible_code`); seta `patient_user_code` no responsável (ponteiro do **funil**) |
| `PATCH /users/me/patients/:id` | Persistência parcial do paciente |
| `GET /users/me/patients` | Lista (0 ou 1 no funil típico) |

Semântica de `patient_user_code` (funil vs `services.patient_user_code` no atendimento): [fields.md §3](./fields.md#semântica-canônica-de-patient_user_code-dois-contextos).

Atualizar [`../../api/domain-routes.md`](../../api/domain-routes.md) na mesma entrega.

### 9. E-mail já cadastrado (`register-email` / exists)

| Situação | Resposta |
|---|---|
| E-mail livre | 201 + sessão fase 1 |
| Existe, `status=Associado` | **409** `ACCOUNT_EXISTS` → orientar login |
| Existe, `associate_status` ∈ 1–5 (em andamento) | **409** `ACCOUNT_IN_PROGRESS` → orientar login para retomar |
| Registro só `patient` com mesmo e-mail | Não bloqueia create do responsável (paciente herda e-mail; unicidade de `email_account` aplica-se a responsáveis / não-patient) |

`GET /users/exists?email=` (auth pública rate-limited ou só uso interno do register): retorna `{ exists, state: "none"|"in_progress"|"associado" }` sem dados sensíveis.

### 10. Migração de dados legado → fases 1–5

Script na entrega (ou na migração Directus→OSS), usando o mapa de [flow.md](./flow.md):

- Inteiros antigos → `associate_status` 1–5
- Strings antigas → `status` / fase
- `log` → `invalid_fields`
- `medical_prescription` → `prescription` (já no schema)
- `contract` → `adhesion_term`

### 11. Painel / acolhimento

**Na mesma entrega do cadastramento** (mínimo necessário):

- Onde o painel exibe ou filtra `associate_status`, usar legendas das fases **1–5**.
- Tratar `status=Associado` / `patient` como conclusões.
- Não depender dos inteiros opacos 0,3,4,7,9.

Refino visual completo do acolhimento pode continuar depois; a **leitura correta das flags** é obrigatória para não quebrar operação.

---

## Fora desta entrega

| Item | Quando |
|---|---|
| Assinatura real de termos (doc-sign nativo) | Spec [`../doc-sign/`](../doc-sign/README.md) — implementação pendente |
| `awaiting_signature` como status string | Com o módulo termos |
| BeeViral / `met_us` / comprovante endereço | Nunca (OSS) |

---

## Checklist da entrega cadastramento

- [x] Auth associado + cookies `associate_session` + bcrypt
- [x] Reset senha server-side (+ colunas token)
- [x] Fases 1–5, guards, menu
- [x] Persistência parcial + `invalid_fields` (contrato 200/meta)
- [x] CIAP2 associado/paciente
- [x] Assistente docs (RG/CNH) + `documents/status`
- [x] `POST/PATCH` patients
- [x] Regra e-mail exists / 409
- [x] Fase 4: UI + stub API **“módulo de termos em desenvolvimento”** (sem assinatura real)
- [x] Fase 5 (acessível após módulo termos ou bypass QA)
- [x] Hidratação do form pela API
- [x] Painel: leitura fases 1–5 *(esqueleto `apps/panel` + script SQL de mapa; painel legado não migrado)*
- [x] Script mapa migração legado (`project-tools/sql/migrate-legacy-associate-status.sql`)
- [x] Theming + estrutura `apps/registration`
- [x] Sem `met_us` / `bvid` / `proof_of_address` / `aguardando-aprovacao`

## Relação com o manifesto

[MANIFESTO.md](../../../../MANIFESTO.md) §7.
