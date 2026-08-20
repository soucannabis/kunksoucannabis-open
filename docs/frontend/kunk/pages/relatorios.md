# Relatórios (catálogo)

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.
> Fonte: `kunksoucannabis`.

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/app/relatorios` |
| **Componente** | `Reports` |
| **Arquivo legado** | `src/components/master/reports.jsx` |
| **Permissões** | Administrador | Acolhimento | Produção |

## Descrição

Catálogo de relatórios salvos (exclui type=dashboard).

## Funcionalidades

- Listar / buscar / favoritar / excluir relatórios
- Abrir construtor em `/app/novo-relatorio`

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **Directus reports** | `/api/directus/reports` |
| **PostgreSQL Reports** | execução via backend |

## Dependências de outras páginas / módulos

- Novo relatório
- Dashboards

## Observações

- —

## Decisão open-source

> Preencher na revisão de escopo.

| Opção | Escolha |
|---|---|
| **Manter** | |
| **Remover** | |
| **Modificar** | |
| **Notas** | Core — manter (cuidado com SQL livre no OSS). |

## Status

`documentado` — aguardando definição de escopo OSS.
