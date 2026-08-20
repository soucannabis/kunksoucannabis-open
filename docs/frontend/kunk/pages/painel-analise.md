# Painel de análise institucional

> Documentação funcional da página legada — base para o Dashboard Analytics no Kunk open-source.

## Identificação

| Campo | Valor |
|---|---|
| **Rota legada** | `/app/painel-analise` |
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

## Decisão open-source

| Opção | Escolha |
|---|---|
| **Manter** | KPIs/charts por domínio (associados, serviços, pedidos, triagem) |
| **Modificar** | Agregação no backend; filtros por bloco; menu sob Relatórios |
| **Remover** | Beeviral embed; o schema de origem analytics proxy |
| **Notas** | Ver [analytics/](../analytics/) |

## Status

`implementado` — Dashboard Analytics OSS.
