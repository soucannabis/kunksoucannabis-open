# Relatório de serviços (externo)

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.
> Fonte: `kunksoucannabis`.

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/relatorio/servicos` |
| **Componente** | `ReportService` |
| **Arquivo legado** | `src/components/master/reportServices.jsx` |
| **Permissões** | Qualquer usuário autenticado (sem check de papel na rota) |

## Descrição

Visão de serviços para prescritores validarem/contestarem atendimentos e comissões — fora do shell `/app`.

## Funcionalidades

- Listar serviços vinculados ao prescritor
- Validar ou contestar serviços
- Consultar cupons do prescritor e documentos
- Notificar via WhatsApp (Utalk) ao resolver
- Logout

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **Directus** | services, professionals, coupons, documents, users |
| **Utalk / WhatsApp** | `/api/utalk/message` |
| **Auth** | logout |

## Dependências de outras páginas / módulos

- Espelho de `/app/relatorios/servicos`
- Prescritores
- Cupons

## Observações

- —

## Decisão open-source

> Preencher na revisão de escopo.

| Opção | Escolha |
|---|---|
| **Manter** | |
| **Remover** | |
| **Modificar** | |
| **Notas** | Core de comissão prescritor; reforçar guard de papel no OSS. |

## Status

`documentado` — aguardando definição de escopo OSS.
