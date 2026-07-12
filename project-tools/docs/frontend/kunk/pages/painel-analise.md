# Painel de análise institucional

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.
> Fonte: `kunksoucannabis`.

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/app/painel-analise` |
| **Componente** | `PainelAnaliseInstitucional → PainelAnalisePage (surface=painel)` |
| **Arquivo legado** | `src/components/master/painelAnaliseInstitucional.jsx + painelAnalisePage.jsx + config/painelAnalise.layout.json` |
| **Permissões** | Administrador | Acolhimento | Produção |

## Descrição

Dashboard analítico institucional com KPIs de associados, serviços, pedidos e triagem.

## Funcionalidades

- Blocos KPI / gráficos / tabelas configuráveis via layout JSON
- Filtros de período e abas
- Embed/consulta Beeviral Analytics
- Query analytics via Directus proxy

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **Directus analytics** | `/api/directus/analytics/items-query` |
| **Beeviral Analytics** | API de participantes/campanhas |
| **kunk-user maps** | mapeamento de operadores |

## Dependências de outras páginas / módulos

- Beeviral Analytics
- Dados de Users/Orders/Services/Reception

## Observações

- Engine genérico; layout de KPIs muito SC

## Decisão open-source

> Preencher na revisão de escopo.

| Opção | Escolha |
|---|---|
| **Manter** | |
| **Remover** | |
| **Modificar** | |
| **Notas** | Híbrido — engine genérico; layout SC. Beeviral embed = remover/opcional. |

## Status

`documentado` — aguardando definição de escopo OSS.
