# Analytics Dashboard — Documentação

> Página **Relatórios → Dashboard** no Kunk OSS (`apps/kunk`), com agregação no `kunk-api`.
> **Fora de escopo:** Beeviral, Nibo, dashboards SQL editáveis (`reports` collection).

## Objetivo

Visão geral institucional com KPIs e gráficos de:

- Associados
- Serviços
- Pedidos
- Triagem

## Rota e menu

| Item | Valor |
|---|---|
| Path | `/app/relatorios/dashboard` |
| Menu | Relatórios → Dashboard (`relatorios-dashboard`) |
| Página | `apps/kunk/src/pages/analytics/AnalyticsDashboardPage.jsx` |
| Auth | Staff Kunk (`RequireKunkStaff`) + `authorize('reports', 'read')` na API |

## Índice

| Documento | Conteúdo |
|---|---|
| [api.md](./api.md) | Endpoints `/analytics/*` e shape da resposta |
| [flow.md](./flow.md) | Filtro global, filtros por bloco, abas, cache |
| [gaps.md](./gaps.md) | Limitações e próximos passos |

## Stack

- Front: MUI + **Recharts**
- Back: SQL agregado (`date_trunc`, `COUNT`, `SUM`, `GROUP BY`)
- Blocos declarativos em `analyticsLayout.js` (padrão KPI / chart / ranking)
