# Triagem — Campos, status e `system_configs`

## Tabela `reception` (schema alvo)

Colunas relevantes (snake_case). Fonte: `target-schema.sql` / collection Reception.

| Coluna | Uso na triagem |
|---|---|
| `id` | PK |
| `date_created` / `date_updated` | Ordenação e “tempo na fila” |
| `name`, `last_name`, `full_name` | Identidade do contato |
| `email`, `phone` | Contato; e-mail usado no link automático |
| `option1`, `option2` | Opções do form (legado: tipo de pedido de ajuda) |
| `is_associate` | Derivado do vínculo (`associate_code`); **não** é mais campo do formulário público |
| `message` | Mensagem livre |
| `code` | UUID público / deep-link `?t=` |
| `status` | Value do status configurado (ex. `waiting`, `done`, ou slug custom) |
| `associate_name`, `associate_code` | Vínculo com `users.user_code` |
| `avatar_url`, `patient_name`, `attendant` | UI operacional |
| `tags` | JSONB — tags + **custom_fields** do form |
| `completion_reason` | `Pedido` \| `Serviço` \| `Agendamento` (legado `action`) |
| `is_prescriber`, `at` | Flags auxiliares |
| `chat_id` | **Não usar** no v1 (Utalk fora de escopo); coluna pode permanecer null |

Campos legado **não portados**: `bvid` (Beeviral).

---

## `system = triage`

Toda configuração da feature usa `system_configs` com `system = 'triage'`, `is_sensitive = false` (exceto se no futuro houver secrets). Cascata: DB → env → `hardcoded_default`.

### Keys propostas

| Key | `value_type` | Default | Descrição |
|---|---|---|---|
| `triage.form.fields` | `json` | ver abaixo | Lista ordenada de campos do formulário público |
| `triage.form.custom_fields` | `json` | `[]` | Definições de campos personalizados |
| `triage.statuses` | `json` | ver abaixo | Status da sidebar / menu do avatar |
| `triage.module.associate_docs` | `boolean` / string `true\|false` | `false` | Módulo documentos/dados na triagem |
| `triage.public_form_enabled` | `boolean` | `true` | Liga/desliga o form público |

Opcional futuro: `triage.public_form_title`, `triage.public_form_intro` (textos do form).

---

## Formulário — campos padrão

Disponibilizar **todos** os necessários para um cadastro de triagem. O admin pode **remover** (ocultar) qualquer um, exceto recomenda-se manter `email` para o vínculo automático.

| `id` (estável) | Label sugerido | Coluna / destino | Obrigatório default | Removível |
|---|---|---|---|---|
| `name` | Nome | `name` | sim | sim |
| `last_name` | Sobrenome | `last_name` | sim | sim |
| `email` | E-mail | `email` | sim | sim (desencorajado) |
| `phone` | Telefone | `phone` | sim | sim |
| `option1` | Como podemos ajudar? (select) | `option1` | não | sim |
| `option2` | Opção 2 | `option2` | não | sim |
| `message` | Mensagem | `message` | não | sim |
| `patient_name` | Nome do paciente | `patient_name` | não | sim |

### Shape de `triage.form.fields`

```json
[
  { "id": "name", "enabled": true, "required": true, "label": "Nome", "order": 1 },
  { "id": "last_name", "enabled": true, "required": true, "label": "Sobrenome", "order": 2 },
  { "id": "email", "enabled": true, "required": true, "label": "E-mail", "order": 3 },
  { "id": "phone", "enabled": true, "required": true, "label": "Telefone", "order": 4 },
  { "id": "option1", "enabled": true, "required": false, "label": "Como podemos ajudar?", "order": 5, "type": "select", "options": ["Preciso de óleo / produto", "Renovação de receita", "Agendamento / consulta", "Dúvidas sobre cadastro", "Outro"] },
  { "id": "option2", "enabled": false, "required": false, "label": "Opção 2", "order": 6 },
  { "id": "message", "enabled": true, "required": false, "label": "Mensagem", "order": 7 },
  { "id": "patient_name", "enabled": false, "required": false, "label": "Nome do paciente", "order": 8 }
]
```

- `enabled: false` = não aparece no form público (campo “removido” da UI).
- Seed SQL deve inserir essa lista como `hardcoded_default`.

---

## Campos personalizados

Definidos em `triage.form.custom_fields`. Aparecem **no formulário público** e na **página de triagem** (coluna/seção “Campos personalizados”).

### Shape

```json
[
  {
    "id": "cf_preferencia_horario",
    "label": "Preferência de horário",
    "type": "text",
    "required": false,
    "enabled": true,
    "order": 100,
    "options": null
  },
  {
    "id": "cf_origem",
    "label": "Como conheceu a associação?",
    "type": "select",
    "required": false,
    "enabled": true,
    "order": 101,
    "options": ["Indicação", "Instagram", "Outro"]
  }
]
```

Tipos v1: `text`, `textarea`, `select`, `checkbox` (estender depois se necessário).

### Persistência no registro

Em `reception.tags` (JSONB):

```json
{
  "labels": [],
  "custom_fields": {
    "cf_preferencia_horario": "manhã",
    "cf_origem": "Instagram"
  }
}
```

Não criar coluna SQL por campo custom — evita migração a cada alteração do form.

Na UI da triagem: ler `tags.custom_fields` e exibir labels a partir da config atual (se um campo for removido da config, ainda pode exibir a chave crua ou ocultar).

---

## Status — `triage.statuses`

### Shape

```json
[
  {
    "id": "waiting",
    "value": "waiting",
    "label": "Espera",
    "order": 1,
    "is_default_entry": true,
    "is_terminal": false,
    "system": true,
    "icon": "AccessTimeFilled",
    "color": "#7A5B7A"
  },
  {
    "id": "done",
    "value": "done",
    "label": "Concluído",
    "order": 99,
    "is_default_entry": false,
    "is_terminal": true,
    "system": true,
    "icon": "CheckCircle",
    "color": "#2e7d32"
  }
]
```

Campos opcionais de apresentação (editáveis no admin `/triagem/status`):

| Campo | Detalhe |
|---|---|
| `icon` | Nome MUI (`AccessTimeFilled`, `CheckCircle`, …) da lista curada em `@kunk/config` |
| `color` | Hex (`#7A5B7A`) aplicada ao ícone na sidebar e no menu do avatar |

Configs antigas sem `icon`/`color` recebem fallback por heurística (`normalizeTriageStatuses`).

Regras:

| Regra | Detalhe |
|---|---|
| Espera | Sempre existe; `is_default_entry: true`; form público grava `status = value` deste item |
| Concluído | Sempre existe; `is_terminal: true`; usado ao redirecionar/contabilizar pedidos/serviços |
| Custom | Admin cria (`system: false`); pode editar label/order; pode excluir se nenhum reception usar (ou arquivar) |
| Menu avatar | Lista todos com `is_terminal` ou não — todos selecionáveis, inclusive Espera e Concluído |
| Sidebar | Ordem = `order`; contagem por `reception.status === value` |

Compatibilidade legado (opcional na migração de dados): mapear strings antigas (`""` / null → `waiting`; `Finalizado` → `done`; `Aguardando Retorno` → status custom criado no seed de migração).

---

## Módulo documentos/dados

| Key | Default | Comportamento |
|---|---|---|
| `triage.module.associate_docs` | `false` | `false`: UI da triagem **não** oferece controle de docs/dados. `true`: permite abrir módulo do associado a partir da linha (dados + documentos). **Sem** histórico de doações. |

O módulo em si (componentes/API de users/files) deve **existir** no codebase; só a **exposição na triagem** é gated pela flag.
