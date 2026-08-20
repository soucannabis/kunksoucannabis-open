# Admin — Gaps e decisões

> Decisões abaixo estão **propostas para fechamento** antes/durante a implementação de `apps/admin`.
> Objetivo: painel de administração da instância na lógica de sistemas unificados (porta/subdomínio próprios).

## Decisões de produto

| Tema | Decisão |
|---|---|
| Papel do app | Admin da **instância** (dados + configs + operadores), não o painel de acolhimento |
| Superfície | Subdomínio `admin.` · pasta `apps/admin` · porta dev **4256** |
| Quem entra | Só `system_users` com role **`Administrador`** |
| Auth | Mesmo canal do painel: login/senha → cookie `session_token` |
| Associados | Geridos na área **Dados** (`users`), não na área Usuários |
| Área Usuários | Só operadores (`system_users`) + roles |
| SQL livre | **Não** — só CRUD whitelist + `/config` + `/files` |
| o schema de origem | Não depende; substitui a UI admin que o schema anterior cobria |

---

## Decisões técnicas

### 1. Auth e gate

| Item | Decisão |
|---|---|
| Endpoints | Reusar `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Cookie | `session_token` (não criar `admin_session` no MVP) |
| Gate front | Após `/me`, exigir `Administrador` |
| Gate API | Middleware `requireRole('Administrador')` nas rotas `/config/*` admin, `/admin/*`, e mutações amplas se necessário |
| Outras roles | 403 no app admin; continuam válidas no painel |

### 2. Monorepo e porta

| Item | Valor |
|---|---|
| Pasta | `apps/admin` |
| Dev | `http://localhost:4256` |
| Bootstrap env | `VITE_URL`, `VITE_API_URL` (igual registration) |
| Pacotes | `api-client`, `auth-session`, `config` — reusar; UI pode ser própria (utilitária) |
| `system` em configs | `admin` para branding opcional do próprio app |

Atualizar [`../structure.md`](../structure.md) e [`../README.md`](../README.md) ao implementar.

### 3. Área Dados

| Item | Decisão |
|---|---|
| API | `/items/:collection` + whitelist atual |
| Formulários | Gerados a partir do schema conhecido (espelho de `kunk-api` collections / `GET /admin/schema` se entregue) |
| Relações | Links clicáveis + busca para FKs; abas para junctions `*_files` |
| Arquivos | Preview/download via `/files`; listagem `GET /files` se faltar |
| `system_configs` | **Não** editar só via items no MVP — usar área Configs |

### 4. Área System configs

| Item | Decisão |
|---|---|
| Agrupamento | Por coluna `system` |
| API | Rotas autenticadas `/config` (ver [api.md](./api.md)); público permanece `/config/public` |
| Sensíveis | AES-256-GCM at-rest; UI máscara; write envia plaintext uma vez |
| Cascata | DB → env → hardcoded (já na API); UI mostra `source` |
| Criar key | Permitido no admin (avançado) |
| Seed | Manter seeds SQL por sistema (`registration`, depois `panel` / `terms` / `modules`) |

### 5. Área Usuários e permissões

| Item | Decisão |
|---|---|
| Tabela | `system_users` |
| Roles | Array em `permissions`; catálogo fixo alinhado a `authorization.md` / `rbac.js` |
| Matriz RBAC collection×role | **Não** editável no UI no MVP (código da API) |
| **Páginas do Kunk por role** | **Criar** — `kunk.role_pages`; default `"*"` (todas) para todas as roles staff; UI em `/usuarios/paginas` |
| Último admin | Server bloqueia remoção/desativação do último `Administrador` (`LAST_ADMIN`) |
| Senha | Mín. 8; bcrypt; campo write-only na UI |
| Delete | MVP: preferir **desativar** + delete opcional |

Spec: [`../kunk/servicos/admin.md`](../kunk/servicos/admin.md#3-páginas-do-kunk-por-role).

### 6. Segurança

| Item | Decisão |
|---|---|
| Secrets no bundle | Proibido |
| Rate limit | Login já rate-limited |
| Audit log | Fora do MVP (registrar depois se necessário) |
| CORS | Incluir origem `admin.` / `:4256` |

---

## Checklist da entrega

### App `apps/admin`

- [ ] Scaffold Vite + React (JS) na porta 4256
- [ ] Login / logout / gate `Administrador`
- [ ] Shell com navegação: Dados · Configs · Usuários
- [ ] Browser CRUD de collections + FKs + arquivos
- [ ] UI `system_configs` por sistema
- [ ] CRUD operadores + editor de roles
- [ ] **Páginas do Kunk por role** (`role_pages`, default allow-all)
- [ ] Docker compose / script `dev:admin` na raiz (padrão registration)
- [ ] CORS/proxy apontando para `kunk-api`

### API (`kunk-api`) — junto com o app

- [ ] `requireRole('Administrador')` nas rotas admin
- [ ] `GET/PATCH/POST/DELETE /config` (admin) + `GET /config/systems` + `clear`
- [ ] Completar CRUD domínio `/system-users/:id` se ainda parcial
- [ ] Guard `LAST_ADMIN`
- [ ] `GET /files` listagem (se ausente)
- [ ] Opcional: `GET /admin/schema`, `GET /admin/roles`
- [ ] CORS com origem do admin

### Docs / índices

- [ ] Entrada em `frontend/README.md` e `structure.md`
- [ ] Mencionar `admin.` no diagrama da documentação raiz quando o app existir

---

## Ordem sugerida de implementação

1. Gate auth + shell vazio 
2. Usuários / permissões (menor superfície, desbloqueia operadores) 
3. System configs (desbloqueia branding dos outros sistemas sem redeploy) 
4. Browser de dados + arquivos + relações 

---

## Status

`in progress` — implementação de `apps/admin` em andamento / entregue conforme checklist.
