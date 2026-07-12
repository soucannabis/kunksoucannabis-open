# Painel de análise institucional

> Documentação funcional da página legada — base para o Dashboard Analytics no Kunk open-source.
> Fonte: `kunksoucannabis`.

## Identificação

| Campo | Valor |
|---|---|
| **Rota legada** | `/app/painel-analise` |
| **Componente legado** | `PainelAnaliseInstitucional → PainelAnalisePage (surface=painel)` |
| **Arquivo legado** | `src/components/master/painelAnaliseInstitucional.jsx + painelAnalisePage.jsx + config/painelAnalise.layout.json` |
| **Permissões** | Administrador \| Acolhimento \| Produção |

## Descrição

Dashboard analítico institucional com KPIs de associados, serviços, pedidos e triagem.

## Implementação OSS

| Campo | Valor |
|---|---|
| **Rota** | `/app/relatorios/dashboard` |
| **Menu** | Relatórios → Dashboard |
| **Spec** | [../analytics/README.md](../analytics/README.md) |
| **Página** | `apps/kunk/src/pages/analytics/AnalyticsDashboardPage.jsx` |
| **API** | `GET /api/v1/analytics/{associates,services,orders,reception}` |

## Funcionalidades (legado → OSS)

- Blocos KPI / gráficos / rankings — **mantidos** (layout declarativo + Recharts)
- Filtros de período e abas — **mantidos** + filtros locais por bloco
- Embed Beeviral Analytics — **removido**
- Query via Directus proxy — **substituído** por agregação SQL no `kunk-api`

## Decisão open-source

| Opção | Escolha |
|---|---|
| **Manter** | KPIs/charts por domínio (associados, serviços, pedidos, triagem) |
| **Modificar** | Agregação no backend; filtros por bloco; menu sob Relatórios |
| **Remover** | Beeviral embed; Directus analytics proxy |
| **Notas** | Ver [analytics/](../analytics/) |

## Status

`implementado` — Dashboard Analytics OSS.
