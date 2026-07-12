# Triagem — Admin (`apps/admin`)

## Área no app

Nova seção na navegação do admin:

| Rota | Conteúdo |
|---|---|
| `/triagem` | Índice da área Triagem |
| `/triagem/formulario` | Configuração do formulário público |
| `/triagem/status` | CRUD de status da fila |
| `/triagem/modulos` | Feature flags (documentos/dados, etc.) |

Alternativa aceitável: agrupar sob `/configs` com UI dedicada (como `/aparencia`), desde que a nav deixe claro **Triagem**. Preferência: rotas `/triagem/*` + persistência em `system_configs` (`system=triage`).

Papel: apenas `Administrador` (mesmo guard do restante do admin).

---

## 1. Formulário da triagem (`/triagem/formulario`)

### Objetivos

- Listar campos **padrão** (pré-habilitados) com toggle enabled/required e label editável.
- Permitir **desabilitar** (= remover da UI pública) qualquer campo padrão.
- **Adicionar campos personalizados** (id gerado, label, type, required, options).
- Preview opcional do form.
- Salvar em `triage.form.fields` e `triage.form.custom_fields` via API `/config` (create/update como em Aparência / visible_fields).

### UX sugerida

1. Seção “Campos padrão” — checklist / lista com drag de ordem.
2. Seção “Campos personalizados” — botão “Adicionar campo” → modal (label, tipo, obrigatório, opções se select).
3. Botão Salvar (só keys alteradas).
4. Texto de ajuda: campos personalizados aparecem na página operacional de triagem.

### Formulário público (consumo)

- Endpoint público: `GET /config/public?system=triage` (só keys não sensíveis) **ou** endpoint dedicado `GET /reception/form-schema` que resolve a config.
- Página pública: pode viver em `apps/kunk` rota pública (`/triagem/formulario` público) **ou** app/`apps/registration`-like mínimo. Decisão de hospedagem em [gaps.md](./gaps.md); o contrato de campos é o mesmo.

---

## 2. Status (`/triagem/status`)

### Objetivos

- Exibir statuses do seed: **Espera** (entrada) e **Concluído** (terminal) — não excluíveis (`system: true`).
- Permitir criar novos (label, value/slug, ordem, ícone, cor).
- Editar labels dos system; value dos system **imutável** (`waiting` / `done`).
- Escolher **ícone** (lista curada) e **cor** (hex) por status — refletidos na sidebar/menu da triagem.
- Excluir custom apenas se não houver `reception` com aquele `status` (ou forçar remapeamento).
- Salvar JSON em `triage.statuses`.

### Relação com a UI operacional

- Sidebar do `apps/kunk` lê essa lista.
- Menu ao clicar no **avatar** usa a mesma lista para PATCH `reception.status`.

---

## 3. Módulos (`/triagem/modulos`)

| Módulo | Key | Default | Descrição |
|---|---|---|---|
| Documentos e dados do associado | `triage.module.associate_docs` | **desligado** | Quando ligado, a triagem operacional mostra ação para abrir dados/documentos do associado linkado. |

UI: switch + texto explicando que o módulo existe no produto mas só aparece na triagem se ativado.

---

## Persistência (padrão técnico)

Espelhar [`kunkAppearanceConfig.js`](../../../../apps/admin/src/lib/kunkAppearanceConfig.js) / visible fields:

1. `GET /config?system=triage`
2. Localizar item por `key`
3. `PATCH /config/:id` ou `POST /config` com `value` JSON stringificado, `value_type: 'json'`
4. Seed SQL idempotente: `project-tools/sql/alter-system-configs-triage.sql` (a criar na implementação)

---

## Fora da área Triagem no admin

- CRUD genérico de linhas `reception` continua disponível em **Dados** (`/dados/reception`) se a collection estiver na whitelist — útil para suporte; a operação diária é no Kunk.
- Aparência / branding do Kunk permanece em `/aparencia` (não misturar).
