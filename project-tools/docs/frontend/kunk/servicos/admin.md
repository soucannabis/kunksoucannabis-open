# Serviços — Admin

## Áreas

| App | Rota | Conteúdo |
|---|---|---|
| `apps/admin` | `/servicos-externos` | Incluir card **Google Calendar** na lista |
| `apps/admin` | `/servicos-externos/google_calendar` | Assistente OAuth + calendário principal |
| `apps/kunk` | `/app/profissionais` | Gestão operacional de profissionais |

Papel: apenas `Administrador` (serviços externos + páginas por role).  
Acesso a Serviços/Profissionais no Kunk: via `kunk.role_pages` (default todas as páginas).

Atualizar nav do admin e [`../../admin/flow.md`](../../admin/flow.md).

---

## 1. Serviços externos — Google Calendar

Seguir o mesmo padrão de Loggi / Melhor Envio / Geoapify:

1. Card na lista `/servicos-externos`
2. Assistente em `/servicos-externos/google_calendar`
3. Secrets em `system_api_credentials`
4. Flags em `system_configs` (`system=modules`)
5. **Não salvar** credencial se o teste falhar

### Card na lista

| Elemento | Binding |
|---|---|
| Switch Habilitado | `modules.google_calendar.enabled` |
| Checkbox “Usar no agendamento de serviços” | `modules.google_calendar.use_for_scheduling` |
| Badge credenciais | `não configurado` \| `env` \| `configurado` \| `teste ok` \| `teste falhou` |
| Botão Configurar | Abre assistente |
| Botão Testar | `POST …/test` |

Descrição curta: “Agenda compartilhada Google — eventos nas agendas dos profissionais.”

### Assistente de autenticação (passos)

Espelhar Melhor Envio (OAuth authorization code) + seleção de calendário (específico deste módulo):

```
1. Credenciais do app Google
   - client_id
   - client_secret
   - redirect_uri (readonly hint se fixo no env)

2. Autorizar conta Google
   - Botão “Autorizar com Google”
   - Popup → /modules/google_calendar/oauth/authorize
   - Callback público → postMessage({ type: 'google-calendar-oauth' })
   - Poll oauth/status
   - refresh_token / access_token NÃO aparecem no form (HIDDEN_CRED_FIELDS)

3. Testar conexão
   - Lista calendários da conta; falha = não persiste secrets novos

4. Calendário principal da aplicação
   - Select com agendas retornadas pela API
   - Grava modules.google_calendar.primary_calendar_id
   - Ajuda: “Calendário da associação (principal). Agrupa a conta;
     cada profissional usa um calendário secundário no cadastro dele.
     Eventos de consulta nunca vão no principal.”

5. Concluir
   - enabled pode ser ligado aqui ou no card
```

### Modelo mental: principal + secundários

```
Conta Google autorizada (1 OAuth / refresh_token)
  ├── Calendário PRINCIPAL (associação)     → primary_calendar_id
  ├── Calendário secundário A               → profissional 1.calendar_id
  ├── Calendário secundário B               → profissional 2.calendar_id
  └── … (novos secundários conforme a associação precisa)
```

- A associação cria o calendário principal dela e adiciona calendários secundários por profissional.
- A conta OAuth precisa ter **acesso writer** aos secundários.
- Agendar serviço usa **sempre** `professionals.calendar_id` (secundário). Sem `calendar_id` → não cria evento.

### SQL / seed (implementação)

Criar alters no estilo Geoapify:

- `alter-system-api-credentials-google-calendar.sql`
- `alter-system-configs-modules-google-calendar.sql` (`enabled`, `use_for_scheduling`, `primary_calendar_id`)

Incluir `google_calendar` em `SERVICES` de `externalServices.js`.

---

## 2. Gestão de profissionais (`apps/kunk`)

Rota: `/app/profissionais` (menu **Profissionais**; redirect `/app/prescritores` → `/app/profissionais`).

Uma tabela, dois papéis claros na UI:

| Filtro | Critério |
|---|---|
| Todos | Sem filtro de papel |
| Colaboradores | `is_collaborator = true` |
| Prescritores | `is_prescriber = true` |
| Ambos | As duas flags true |

| Capacidade | Detalhe |
|---|---|
| Listar | Filtros acima + active, type, busca |
| Criar / Editar | Dialog completo |
| Excluir / desativar | **Soft-delete** (`active=0`) — obrigatório na UI operacional |
| Colaborador | `is_collaborator` — aparece em Serviços |
| Prescritor | `is_prescriber` — receitas / pedidos (incl. prescritores “de fora”) |
| Valor de consulta | `consultation_price` |
| Tipo | `type` |
| Agenda | Select `calendar_id` = **secundário** (não o principal da associação) |

### Select de agenda no dialog

- Se módulo disabled ou sem OAuth: select disabled + texto “Configure Google Calendar em Serviços externos”.
- Opções: agendas retornadas por `GET /calendars`, com o `primary_calendar_id` marcado como “Principal (associação)” e **não** oferecido como destino de profissional (ou desabilitado).
- Valor salvo: `calendar_id` do secundário.
- Exibir na lista o `summary` resolvido (enrich no GET professionals).

### Prescritor “de fora” vs colaborador

| Cenário | Flags típicas |
|---|---|
| Médico da associação que atende | `is_collaborator` (+ opcional `is_prescriber`) |
| Psicólogo / terapeuta colaborador | `is_collaborator` |
| Prescritor só visto em receita de associado | `is_prescriber` apenas — **não** entra no input de Serviços |
| Colaborador que também receita | ambas |

Sem ranking de split / CreateRecipientModal nesta tela (Pagarme de serviços: Admin → Serviços externos → Pagar.me).

### Migração da rota legada

| Legado | OSS |
|---|---|
| `/app/prescritores` | `/app/profissionais` (gestão + filtros Colaborador / Prescritor) |
| Ranking Pagar.me | Não portar |

Menu: label **Profissionais**; redirect de prescritores.

---

## 3. Páginas do Kunk por role

**Hoje:** o admin só atribui roles ao operador (`/usuarios`); **não** edita quais páginas cada role vê. No Kunk, o trio staff vê o menu inteiro.

**Criar** nesta entrega:

| Peça | Detalhe |
|---|---|
| Rota admin | `/usuarios/paginas` (ou aba em Usuários) — **Páginas por role** |
| Persistência | `system_configs` `system=kunk` / `key=role_pages` (JSON) |
| Shape | `{ "Administrador": ["*"], "Acolhimento": ["*"], "Produção": ["*"], … }` |
| Valores | ids de página do `menuConfig` (ex. `servicos`, `profissionais`, `pedidos`) ou `"*"` |
| **Default** | `"*"` = todas as páginas, para **todas** as roles staff do Kunk |
| UI | Matriz role × checkboxes; “Liberar todas” |
| Kunk | Filtrar menu + guard de rota |

Produção, por default, **inclui** Serviços e Profissionais.

**API (`rbac.js`):** hoje Produção **não** tem `services` na matriz. Ao implementar allow-all de páginas, conceder a Produção pelo menos `RU` em `services` e `services_files` (senão a UI abre e a API responde 403). Ver [`../../admin/flow.md`](../../admin/flow.md).

---

## 4. O que não configurar no admin desta feature (Serviços / Calendar)

| Item | Motivo |
|---|---|
| Pagar.me / payment links | Spec [`../pagamentos-soucannabis/admin.md`](../pagamentos-soucannabis/admin.md) |
| Utalk | Módulo futuro |

Tipos de profissional, taxas (`association_fee`) e preço padrão de consulta ficam no módulo **[Relatórios de serviços — admin](../relatorios-servicos/admin.md)** (`system_configs` `professional_types`). O select de `type` em Profissionais passa a ler esse catálogo.
