# Webmaster (observabilidade)

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/app/webmaster` |
| **Componente** | `WebmasterPage` |
| **Permissões** | Trio staff; Sidebar admin |

## Descrição

Observabilidade do sistema: Web Vitals, atividade de usuários, system errors, insights e config.

## Funcionalidades

- Gráficos de Web Vitals
- Heatmap / atividade de usuários
- Triagem e resolução de system errors
- Insights e limpeza de observability
- Configurações webmaster

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **PostgreSQL Vitals** | `/api/web-vitals/*`, `/api/user-activity/*`, `/api/system-errors/*`, `/api/observability/*` |

## Dependências de outras páginas / módulos

- Tracker global em App.jsx (reportWebVitals)

## Observações

- Redirects: `/app/web-vitals` e `/app/erros-sistema` → `/webmaster`

## Decisão open-source

> Preencher na revisão de escopo.

| Opção | Escolha |
|---|---|
| **Manter** | |
| **Remover** | |
| **Modificar** | |
| **Notas** | Core ops genérico — manter (adaptar ao novo stack). |

## Status

`documentado` — aguardando definição de escopo OSS.
