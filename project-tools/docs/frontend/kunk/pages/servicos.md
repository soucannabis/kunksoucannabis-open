# Serviços

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.
> Fonte: `kunksoucannabis`.
> **Spec de implementação OSS:** [`../servicos/README.md`](../servicos/README.md).

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/app/acolhimento/servicos` |
| **Componente** | `Services` |
| **Arquivo legado** | `src/components/master/services.jsx` |
| **Permissões** | Administrador | Acolhimento | Produção |

## Descrição

Agendamento e gestão de serviços (consultas/atendimentos) com calendário. Uma das **quatro páginas principais** do Kunk.

## Funcionalidades

- CRUD de serviços
- Seleção de profissionais/prescritores (`is_collaborator`)
- Agrupamento por `code` / `booking_group_code` (vários profissionais no mesmo associado)
- Modal de infos / observações
- Sincronizar Google Calendar (create/update/delete)
- Anexar documentos
- Tags
- Finalizar triagem vinculada

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **Directus / kunk-api** | services, professionals, users, reception |
| **Google Calendar** | `/modules/google_calendar/` (legado `/api/googleCalendar/`) |

## Dependências de outras páginas / módulos

- Triagem
- Profissionais (`/app/profissionais`)
- Admin → Serviços externos (Google Calendar)

## Decisão open-source

| Opção | Escolha |
|---|---|
| **Manter** | Lista + filtros + layout legado; agrupamento por código; modal Info; multi-profissional; Google Calendar; tags; comprovante; valores manuais |
| **Remover** | PaymentModal / Pagar.me / `payment_link`; toggle pago-pendente; Beeviral; cupons; Utalk no v1 |
| **Modificar** | Status sem checkout; `consultation_price` no profissional; agenda editável na gestão de profissionais; calendário principal no admin |
| **Notas** | Spec completa em [`../servicos/`](../servicos/README.md). Layout visual = requisito. |

## Status

`especificado` — pronto para implementação ([servicos/](../servicos/README.md)).
