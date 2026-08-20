# Nibo Dashboard

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/app/nibo-dashboard/*` |
| **Componente** | `NiboDashboardApp` |
| **Permissões** | Rota: trio staff; Sidebar tipicamente só Administrador |

## Descrição

Painel financeiro Nibo embutido (contas, fluxo de caixa, contas a pagar, categorias).

## Funcionalidades

- Tabs: Dashboard, Fluxo de Caixa, Contas a Pagar, Categorias
- Consulta de summary, accounts, schedules, cashflow, categories

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **Nibo** | proxy `/api/nibo-dashboard/*` |

## Dependências de outras páginas / módulos

- Financeiro (paralelo)

## Observações

- Não são URLs filhas reais no React Router — tabs internas

## Decisão open-source

> Preencher na revisão de escopo.

| Opção | Escolha |
|---|---|
| **Manter** | |
| **Remover** | |
| **Modificar** | |
| **Notas** | Módulo opcional de terceiros (princípio OSS §3.6) — desabilitado por padrão. |

## Status

`documentado` — aguardando definição de escopo OSS.
