# Serviços

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.
> **Spec de implementação OSS:** [`../servicos/README.md`](../servicos/README.md).

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/app/acolhimento/servicos` |
| **Componente** | `Services` |
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
| **o schema de origem / kunk-api** | services, professionals, users, reception |
| **Google Calendar** | `/modules/google_calendar/` (histórico `/api/googleCalendar/`) |

## Dependências de outras páginas / módulos

- Triagem
- Profissionais (`/app/profissionais`)
- Admin → Serviços externos (Google Calendar)

## Decisão open-source

| Opção | Escolha |
|---|---|
| **Manter** | Lista + filtros + layout histórico; agrupamento por código; modal Info; multi-profissional; Google Calendar; tags; comprovante; valores manuais |
| **Remover** | Beeviral; cupons; Utalk no v1 |
| **Modificar** | PaymentModal / `payment_link` quando módulo `pagarme` ativo ([pagamentos-soucannabis](../pagamentos-soucannabis/README.md)); toggle/comprovante permanecem; `consultation_price`; agendas / calendário principal |
| **Notas** | Spec em [`../servicos/`](../servicos/README.md). Pagamentos: [`../pagamentos-soucannabis/`](../pagamentos-soucannabis/README.md). |

## Status

`especificado` — pronto para implementação ([servicos/](../servicos/README.md)).
