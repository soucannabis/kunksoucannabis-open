# Serviços — Documentação de implementação

> Reimplementação da página de serviços (consultas/atendimentos) no produto unificado (`apps/kunk` + `apps/admin` + `kunk-api`).
> Referência legada: [`services.jsx`](../../../../kunksoucannabis/src/components/master/services.jsx) (`Servicess`).
> Agenda legada: [`kunkserver/routes/googleCalendar.js`](../../../../kunksoucannabis/kunkserver/routes/googleCalendar.js) + [`modules/googleCalendar.js`](../../../../kunksoucannabis/kunkserver/modules/googleCalendar.js).
> Profissionais legado: [`ProfessionalsAndPartners.jsx`](../../../../kunksoucannabis/src/components/master/ProfessionalsAndPartners.jsx).

## Objetivo

Recriar o fluxo de **serviços** com:

1. **Mesmo layout e visual** da página legada (barra de filtros, tabela, cores, modal de infos, modal novo serviço)
2. **Agrupamento por `booking_group_code`** (legado: `code`) — vários serviços do mesmo associado com profissionais diferentes no mesmo grupo
3. **Modal de infos do serviço** equivalente ao legado (observações, tags, profissional, telefone, comprovante)
4. **Gestão de profissionais** (CRUD, valor de consulta, tipo/especialidade, visibilidade no input de serviços, agenda Google)
5. **Módulo Google Calendar** no admin de serviços externos + assistente de autenticação OAuth
6. Agendamento na **agenda do profissional** via `calendar_id`

## Fora de escopo (v1 desta feature)

| Item | Motivo |
|---|---|
| Checkout / PaymentModal (Pagar.me) | Explicitamente excluído — não portar |
| `payment_link` / `payment_code` / split | Dependem do módulo de pagamento |
| Cupons no serviço | Fora do escopo de serviços v1 |
| Beeviral (`bvid`) / parceiros | Específico SouCannabis — não portar |
| Utalk / WhatsApp automático | Módulo separado (pode vir depois) |
| CreateRecipientModal / Pagar.me recipients | Pagamento |

Campos de valor (`price`, `donation`, `price_paid`), `payment_type` e status `Aguardando Pagamento` / `Pagamento Concluído` **permanecem** — toggle manual **ou** comprovante enviado (marca pago), sem gerar link de checkout.

## Índice

| Documento | Conteúdo |
|---|---|
| [flow.md](./flow.md) | Fluxos: triagem → criar → listar → info → agendar → profissionais |
| [fields.md](./fields.md) | Campos de `services`, `professionals`, configs Google Calendar |
| [ui-ux.md](./ui-ux.md) | **Layout e visual iguais ao legado** (obrigatório) |
| [admin.md](./admin.md) | Serviços externos (Google Calendar) + gestão de profissionais |
| [api.md](./api.md) | Contratos `kunk-api` (services, professionals, google_calendar) |
| [gaps.md](./gaps.md) | Decisões fechadas + checklist de implementação |

Docs de API do módulo:

| Documento | Conteúdo |
|---|---|
| [`../../api/modules/google_calendar.md`](../../api/modules/google_calendar.md) | OAuth, listagem de agendas, CRUD de eventos |
| [`../../api/modules/credentials.md`](../../api/modules/credentials.md) | Tabela `system_api_credentials` + assistente |

Página legada (inventário curto): [`../pages/servicos.md`](../pages/servicos.md).

Relatório de pagamento a profissionais (mês / taxas / portal): [`../relatorios-servicos/README.md`](../relatorios-servicos/README.md).

## Posicionamento

```
apps/kunk  /app/acolhimento/servicos   ←── operadores (lista + modais)
         │ /app/profissionais          ←── gestão de profissionais
         │
         ├── lista / filtros / tags
         ├── modal novo serviço (1+ profissionais → mesmo booking_group_code)
         ├── modal infos (observações, tags, trocar profissional)
         ├── agendar → Google Calendar (calendário do profissional)
         └── profissionais (CRUD, calendar_id, is_collaborator, consultation_price)
         │
         ▼
    kunk-api /v1
         ├── /items/services | /services/*
         ├── /items/professionals | /professionals/*
         ├── /modules/google_calendar/*
         └── /admin/external-services/google_calendar
         │
         ▼
    PostgreSQL
         ├── services, professionals, services_files
         ├── system_configs (system = modules | google_calendar)
         └── system_api_credentials (service = google_calendar)
         ▲
apps/admin
         └── /servicos-externos/google_calendar  ←── OAuth + calendário principal
```

## Princípios

| Fazer | Não fazer |
|---|---|
| Replicar layout/cores/estrutura do `services.jsx` | Reinventar a listagem como dashboard novo |
| Agrupar por `booking_group_code` (UUID compartilhado) | Tratar cada linha como isolada sem vínculo de grupo |
| Modal Info com template de observações do legado | Remover o modal ou reduzir a um drawer genérico |
| Só profissionais `is_collaborator` no Autocomplete de serviços | Listar todos os prescritores ativos no input |
| Valor de consulta default do profissional | Hardcode só por `type` sem campo no profissional |
| Eventos na agenda cujo `calendar_id` está no profissional | Uma agenda única para todos sem seleção |
| Secrets só se teste OAuth/API ok | Persistir refresh token inválido |
| Registrar valores e tipo de pagamento manualmente | Importar PaymentModal / Pagar.me / payment_link |

## Comportamento legado → OSS

| Legado | OSS |
|---|---|
| `code` (string UUID) no grupo | `booking_group_code` |
| `date` do atendimento | `consultation_date` |
| `donate` | `donation` |
| `professional` (string id) | `professional_id` |
| `associate` (user_code) | `associate_user_code` |
| `kunk_user` | `created_by_user_code` |
| Status OSS | Manter `Aguardando Pagamento` / `Pagamento Concluído` (manual, sem checkout) |
| `calendar_id` só no Directus | Editável na gestão; = calendário **secundário**; admin define **principal** da associação |
| Defaults de preço só por `type` | `consultation_price` no profissional + fallback por `type` |
| Página “Parceiros e Prescritores” misturada | `/app/profissionais` com filtros Colaborador / Prescritor |

## Status desta documentação

`pronta para implementação` — decisões de escopo fechadas (ver [gaps.md](./gaps.md)).
