# Serviços — Documentação de implementação

> Reimplementação da página de serviços (consultas/atendimentos) no produto unificado (`apps/kunk` + `apps/admin` + `kunk-api`).

## Objetivo

Recriar o fluxo de **serviços** com:

1. **Mesmo layout e visual** da página legada (barra de filtros, tabela, cores, modal de infos, modal novo serviço)
2. **Agrupamento por `booking_group_code`**  — vários serviços do mesmo associado com profissionais diferentes no mesmo grupo
3. **Modal de infos do serviço** equivalente aversões anteriores (observações, tags, profissional, telefone, comprovante)
4. **Gestão de profissionais** (CRUD, valor de consulta, tipo/especialidade, visibilidade no input de serviços, agenda Google)
5. **Módulo Google Calendar** no admin de serviços externos + assistente de autenticação OAuth
6. Agendamento na **agenda do profissional** via `calendar_id`

## Fora de escopo (v1 desta feature)

| Item | Motivo |
|---|---|
| Cupons no serviço | Fora do escopo de serviços v1 |
| Beeviral (`bvid`) / parceiros | Específico SouCannabis — não portar |
| Utalk / WhatsApp automático | Módulo separado (pode vir depois) |
| Sync Pedidos SouCannabis | Só pedidos — ver [`../pagamentos-soucannabis/`](../pagamentos-soucannabis/README.md) |

Campos de valor (`price`, `donation`, `price_paid`), `payment_type` e status `Aguardando Pagamento` / `Pagamento Concluído` **permanecem**. Toggle manual / comprovante continuam; **PaymentModal (Pagar.me)** entra quando o módulo `pagarme` estiver ativo — spec [`../pagamentos-soucannabis/`](../pagamentos-soucannabis/README.md). Split SouCannabis em v1 **não** se aplica a serviços.

## Índice

| Documento | Conteúdo |
|---|---|
| [flow.md](./flow.md) | Fluxos: triagem → criar → listar → info → agendar → profissionais |
| [fields.md](./fields.md) | Campos de `services`, `professionals`, configs Google Calendar |
| [ui-ux.md](./ui-ux.md) | **Layout e visual iguais aversões anteriores** (obrigatório) |
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
| Modal Info com template de observações anteriores | Remover o modal ou reduzir a um drawer genérico |
| Só profissionais `is_collaborator` no Autocomplete de serviços | Listar todos os prescritores ativos no input |
| Valor de consulta default do profissional | Hardcode só por `type` sem campo no profissional |
| Eventos na agenda cujo `calendar_id` está no profissional | Uma agenda única para todos sem seleção |
| Secrets só se teste OAuth/API ok | Persistir refresh token inválido |
| Registrar valores e tipo de pagamento (manual / comprovante) | Beeviral / cupons; PaymentModal só se `pagarme` on ([spec](../pagamentos-soucannabis/README.md)) |

## Status desta documentação

`pronta para implementação` — decisões de escopo fechadas (ver [gaps.md](./gaps.md)).
