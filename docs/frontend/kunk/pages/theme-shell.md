# Shell Theme (`/app/*`)

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.
> Fonte: `kunksoucannabis`.

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/app/*` |
| **Componente** | `Theme (JoyOrderDashboardTemplate)` |
| **Arquivo legado** | `src/components/master/theme/theme.jsx (+ Sidebar, Header, QuickNavMenu, …)` |
| **Permissões** | Gate App: Administrador | Acolhimento | Produção |

## Descrição

Layout operacional do Kunk: sidebar, header, changelog, busca global e rotas internas. **O novo Kunk deve copiar esta estrutura de theme sem alterações de layout.**

## Funcionalidades

- Sidebar com menus (Acolhimento, Loja, Serviço Social, Relatórios, Parceiros/Prescritores, Usuários, Dashboards de análise)
- Header / FAB com **busca global** — spec: [../search-global/README.md](../search-global/README.md)
- QuickNav (atalhos Triagem / Pedidos / Serviços)
- Modal de acknowledgment de changelog
- Página **Tags** em Sistema (`/app/tags`) — CRUD do catálogo
- Redirect inicial por papel: Produção→pedidos; Acolhimento→triagem; Admin→cadastramento
- Lazy-load das páginas internas

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **Directus changelog** | `/api/directus/changelog/last` |
| **System errors** | captura global → `/api/system-errors` |
| **Auth** | logout via Sidebar |

## Dependências de outras páginas / módulos

- Todas as rotas internas sob `/app`

## Observações

- Preservar layout/visual exatamente como no legado
- Estrutura de theme.jsx e componentes de theme devem ser copiados

## Decisão open-source

> Preencher na revisão de escopo.

| Opção | Escolha |
|---|---|
| **Manter** | |
| **Remover** | |
| **Modificar** | |
| **Notas** | Core de UX — copiar layout 1:1. |

## Status

`documentado` — aguardando definição de escopo OSS.
