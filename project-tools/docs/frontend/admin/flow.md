# Admin — Fluxo e áreas

> Três áreas do app + autenticação e guards.
> Decisões: [gaps.md](./gaps.md). API: [api.md](./api.md).

## Quem acessa

| Conceito | Valor |
|---|---|
| Tabela | `system_users` |
| Auth | `POST /auth/login` · cookie **`session_token`** (mesmo canal do painel) |
| Gate | `permissions` contém **`Administrador`** |
| Sem role admin | Login pode autenticar na API, mas o app **não** entra no shell — tela 403 / redirect para login com mensagem |

Operadores com só `Acolhimento`, `Produção`, etc. usam o **painel** (`app.`), não o admin.

---

## Rotas do app

| Rota | Área | Auth |
|---|---|---|
| `/login` | Login e-mail + senha | pública |
| `/` | Redirect para `/dados` (ou última área) | admin |
| `/dados` | Browser de collections | admin |
| `/dados/:collection` | Lista da collection | admin |
| `/dados/:collection/novo` | Criar registro | admin |
| `/dados/:collection/:id` | Detalhe / edição | admin |
| `/arquivos` | Lista / preview de `files` | admin |
| `/arquivos/:id` | Metadados + download / preview | admin |
| `/armazenamento` | Buckets S3 / GCS (fora de Serviços externos) | admin |
| `/erros-sistema` | Triagem de `system_errors` | admin |
| `/web-vitals` | Core Web Vitals (`web_vitals`) | admin |
| `/configs` | Índice de sistemas (`system_configs`) | admin |
| `/configs/:system` | Keys daquele sistema | admin |
| `/aparencia` | Aparência do Kunk (branding/tema) | admin |
| `/triagem` | Índice da área Triagem | admin |
| `/triagem/formulario` | Campos do formulário público | admin |
| `/triagem/status` | Status da fila | admin |
| `/triagem/modulos` | Flags (docs/dados, etc.) | admin |
| `/loja` | Redireciona para status dos pedidos | admin |
| `/loja/status-pedidos` | Status de pedidos (`store.order_statuses`) | admin |
| `/servicos-externos/envio` | Remetente, caixa, declaração de conteúdo | admin |
| `/servicos-externos` | Enable/disable Loggi, Melhor Envio, … | admin |
| `/servicos-externos/:service` | Assistente de credenciais + teste | admin |
| `/usuarios` | Lista de operadores (`system_users`) | admin |
| `/usuarios/novo` | Criar operador | admin |
| `/usuarios/:id` | Editar / permissões / status | admin |
| `/usuarios/paginas` | Páginas do Kunk permitidas por role (default: todas; role `Profissional` → só relatório de serviços) | admin |
| `/configs/services` ou `/servicos/tipos` | Tipos + taxas + switch “descontar doação” + preço padrão | admin |

---

## Área 1 — Dados (CRUD)

Substitui a necessidade de um “admin Directus” para o schema alvo.

### Comportamento

1. **Índice de collections** — lista a whitelist da API (`users`, `orders`, `system_users`, …), não tabelas fora do produto OSS.
2. **Lista** — `GET /items/:collection` com `filter`, `sort`, `search`, `limit`/`offset`, `meta=filter_count,total_count`.
3. **Detalhe / edição** — `GET` + `PATCH`; formulário gerado a partir do schema conhecido (campos da collection).
4. **Criar** — `POST /items/:collection`.
5. **Excluir** — `DELETE /items/:collection/:id` com confirmação.
6. **Campos sensíveis** — senhas/tokens nunca exibidos em claro na lista; no formulário, senha só como “definir nova” (write-only).
7. **Arquivos** — campo `file_id` / junctions abrem preview via `/files/:id` e download; upload via `POST /files` + attach na junction quando aplicável.
8. **Excluir dados de exemplo** — no fim do índice `/dados`, botão abre modal com contagens `is_sample` por tabela e confirma exclusão via `DELETE /admin/sample-data`.

### Relações (chaves relacionadas)

O admin deve tornar FKs navegáveis, não só IDs soltos:

| Tipo | Exemplo | UX |
|---|---|---|
| FK inteira | `orders.user` → `users.id` | Link “abrir user #42” + seletor de busca |
| FK UUID de domínio | `services.associate_user_code` → `users.user_code` | Link + busca por nome/código |
| Junction | `users_files`, `orders_files`, `services_files` | Aba “Arquivos” no detalhe do pai; CRUD da junction |
| `include` | onde a API já expande | Painel “relacionados” no detalhe |

Fonte de verdade das relações: schema alvo + [`../../directus/relations.md`](../../directus/relations.md) (legado) + FKs em [`../../../sql/target-schema.sql`](../../../sql/target-schema.sql).

Não inventar SQL livre: só collections whitelist + params documentados em [`../../api/query-parameters.md`](../../api/query-parameters.md).

### Diagrama (área dados)

```
/dados
  └─ escolhe collection
       ├─ lista (filter / search / paginação)
       ├─ novo → POST
       └─ :id → GET / PATCH / DELETE
            ├─ campos escalares
            ├─ FKs → navegar / trocar vínculo
            └─ junctions *_files → preview / upload / detach
```

---

## Área — Armazenamento (buckets)

Fora de **Serviços externos**. Configura o driver de arquivos (`local` | `s3` | `gcs`).

### Comportamento

1. **Menu** `/armazenamento` — status, formulário S3/GCS, testar, ativar.
2. **Modal de incentivo** ao abrir o admin se o driver for `local` (dismiss em `localStorage`: `kunk.admin.storage.prompt.dismissed`).
3. **Lock** — ao ativar o bucket, `locked = true`. Alterar nome do bucket no mesmo provedor continua permitido; troca S3↔GCS só se não houver arquivos na nuvem.

Docs de setup: [`../../api/storage-s3-setup.md`](../../api/storage-s3-setup.md), [`../../api/storage-gcs-setup.md`](../../api/storage-gcs-setup.md).

---

## Área 2 — System configs

Centraliza configuração runtime de **todos** os sistemas da instância.

### Agrupamento

Cada linha em `system_configs` tem coluna **`system`**. A UI agrupa por esse valor:

| `system` | Origem típica |
|---|---|
| `registration` | Branding / textos do cadastramento (já seedado) |
| `panel` | Painel operacional (quando existir) |
| `terms` | Módulo de termos (quando existir) |
| `admin` | Branding leve do próprio admin (opcional) |
| `api` / `modules` | Flags e credenciais server-side (Loggi, Pagar.me, …) |

Novos sistemas entram como novas keys seedadas — o admin lista o que existir no banco.

### Comportamento por key

| Campo | Uso na UI |
|---|---|
| `key` | Nome da variável (ex. `VITE_ASSOCIATION_NAME`) |
| `value` | Valor no DB (editável); vazio = cascata env/hardcoded |
| `value_type` | `string` \| `url` \| `boolean` \| `number` \| `json` — tipa o input |
| `is_sensitive` | Máscara na UI; gravação criptografada no server (`CONFIG_ENCRYPT_KEY`) |
| `is_required` | Badge / validação |
| `allow_hardcoded` / `hardcoded_default` | Mostrar fallback (somente leitura do default) |
| `description` | Ajuda inline |
| Resolução | Exibir `source`: `db` \| `env` \| `hardcoded` \| `empty` (via endpoint admin) |

### Ações

- Listar por sistema
- Editar `value` (e metadados se permitido: description, is_required — ver gaps)
- Criar nova key (admin avançado)
- Limpar `value` (voltar à cascata env/hardcoded)
- **Nunca** expor plaintext de sensíveis já gravados se a API optar por write-only; se retornar valor resolvido, só para role Administrador e com cuidado de audit

Endpoint público `GET /config/public` continua só para apps browser sem secrets. O admin usa rotas autenticadas — ver [api.md](./api.md).

---

## Área 2b — Triagem (configuração)

UI dedicada para a fila de acolhimento. Spec: [`../kunk/triagem/admin.md`](../kunk/triagem/admin.md).

| Subárea | Rota | Persistência (`system=triage`) |
|---|---|---|
| Formulário público | `/triagem/formulario` | `triage.form.fields`, `triage.form.custom_fields` |
| Status da fila | `/triagem/status` | `triage.statuses` |
| Módulos | `/triagem/modulos` | `triage.module.associate_docs` (default off) |

Aparência visual do app Kunk permanece em `/aparencia` (`system=kunk`), separada da triagem.

---

## Área 2c — Loja e serviços externos

UI dedicada para checkout/frete e integrações. Spec: [`../kunk/pedidos/admin.md`](../kunk/pedidos/admin.md).

| Subárea | Rota | Persistência |
|---|---|---|
| Dados de envio | `/servicos-externos/envio` | `system_configs` `system=store` (`ship_from`, `package`, **`content_declaration`**, …) |
| Status pedidos | `/loja/status-pedidos` | `store.order_statuses` (Aguardando / Pagamento concluído + custom) |
| Serviços externos | `/servicos-externos` | `system_configs` `system=modules` (flags) + `system_api_credentials` |
| Assistente | `/servicos-externos/:service` | credentials criptografadas; teste via `/modules/{service}/test` |

Default: frete **entra no total**. Remetente, dimensões e declaração **obrigatórios no admin** (sem valores mágicos no código). Favorito gravável por quem usa o carrinho. Credenciais **só salvam se o teste passar**.

---

## Área 3 — Usuários e permissões

Gestão de **operadores** (`system_users`), não do funil de associados (associados ficam na área Dados → `users`).

### CRUD de operadores

| Ação | Comportamento |
|---|---|
| Listar | Nome, e-mail, status, permissions, última atividade |
| Criar | Nome, e-mail, senha (bcrypt no server), `permissions`, `status` |
| Editar | Dados cadastrais + roles + status (`active` / inativo) |
| Excluir / desativar | Preferir desativar (`status`) no MVP; delete físico com confirmação forte |
| Sessão | Não editar `session_token` manualmente; ação “encerrar sessão” opcional (null token) |

### Permissões (roles)

Campo `system_users.permissions` — JSON array de roles, alinhado a [`../../api/authorization.md`](../../api/authorization.md):

| Role | Uso |
|---|---|
| `Administrador` | Acesso total + **entrada no app admin** |
| `Acolhimento` | Painel operacional |
| `Produção` | Painel operacional |
| `Financeiro` | Painel operacional |
| `Profissional` | Portal do relatório de atendimentos (exclusivo; exige profissional no código interno) |
| `api` | Reservado a tokens |

UI: multi-select / chips das roles conhecidas. Pelo menos um operador `Administrador` deve permanecer ativo (guard no server ao remover a própria role ou ao deletar o último admin).

Matriz collection×role: referência em authorization.md; o admin **não** edita a matriz CRUD no MVP (código da API). Só atribui roles aos usuários.

### Páginas do painel Kunk por role (**criar**)

Hoje **não existe** UI nem config role → páginas. Staff vê o menu inteiro.

| Item | Decisão |
|---|---|
| Onde | Admin `/usuarios/paginas` (ou aba em Usuários) |
| Config | `system_configs` `system=kunk` `key=role_pages` |
| Default | `"*"` (todas as páginas) para cada role staff |
| Consumo | `apps/kunk` filtra menu + rotas |
| Spec | [`../kunk/servicos/admin.md`](../kunk/servicos/admin.md#3-páginas-do-kunk-por-role) |

Produção, Acolhimento e Administrador partem com acesso a **todas** as páginas (incl. Serviços), até o admin restringir.

---

## Guards de sessão

```
abrir rota protegida
  → GET /auth/me
  → sem cookie / 401 → /login
  → user sem role Administrador → tela “Sem permissão”
  → ok → shell do admin
```

Logout: `POST /auth/logout` + redirect `/login`.

Cookie compartilhado com o painel (`session_token`) é aceitável: um Administrador logado no admin também está autenticado no `app.` (mesmo Domain). CORS da API deve incluir a origem do admin.

---

## Diagrama geral

```
┌──────────── login ────────────┐
│  email + senha → /auth/login  │
│  gate: Administrador          │
└───────────────┬───────────────┘
                ▼
┌───────────────────────────────────────────────┐
│  Shell Admin                                  │
│  ┌─────────┐ ┌──────────┐ ┌─────────────────┐ │
│  │ Dados   │ │ Configs  │ │ Usuários / perms│ │
│  │ CRUD +  │ │ system_  │ │ system_users    │ │
│  │ FKs +   │ │ configs  │ │ roles           │ │
│  │ files   │ │ por system│ │                │ │
│  └─────────┘ └──────────┘ └─────────────────┘ │
└───────────────────────────────────────────────┘
```
