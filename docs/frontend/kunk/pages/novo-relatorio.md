# Novo / editar relatório

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.
> Fonte: `kunksoucannabis`.

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/app/novo-relatorio` |
| **Componente** | `Report` |
| **Arquivo legado** | `src/components/master/report.jsx` |
| **Permissões** | Administrador | Acolhimento | Produção |

## Descrição

Construtor e executor de relatórios SQL (colunas, query, save). Arquivo grande (~3k linhas).

## Funcionalidades

- Definir colunas e query
- Executar (`run-query`)
- Salvar relatório
- CRUD de reports

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **Directus reports** | table-columns, run-query, save-report, CRUD |
| **PostgreSQL Reports** | execução SQL |

## Dependências de outras páginas / módulos

- Relatórios
- Dashboards

## Observações

- Poderoso e sensível — restringir no OSS

## Decisão open-source

> Preencher na revisão de escopo.

| Opção | Escolha |
|---|---|
| **Manter** | |
| **Remover** | |
| **Modificar** | |
| **Notas** | Core analítico; endurecer permissões/segurança SQL. |

## Status

`documentado` — aguardando definição de escopo OSS.
