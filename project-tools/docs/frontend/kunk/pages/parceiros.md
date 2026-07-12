# Parceiros

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.
> Fonte: `kunksoucannabis`.

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/app/parceiros` |
| **Componente** | `PartnersPage` |
| **Arquivo legado** | `src/components/master/PartnersPage.jsx` |
| **Permissões** | Administrador | Acolhimento | Produção |

## Descrição

Ranking e CRUD de parceiros (afiliados), com pedidos associados.

## Funcionalidades

- Ranking paginado de parceiros
- Expandir pedidos do parceiro
- Criar / editar / excluir parceiro
- Busca de pedidos por parceiro
- Campo Beeviral ID (bvid) no legado

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **Directus** | partners ranking/CRUD, orders by-partner, orders/search |
| **Beeviral** | ID de afiliado no cadastro do parceiro |

## Dependências de outras páginas / módulos

- Relatório externo de pedidos
- Novo pedido
- Beeviral Analytics

## Observações

- Redirect legado: `/app/parceiroseprescritores` → `/parceiros`

## Decisão open-source

> Preencher na revisão de escopo.

| Opção | Escolha |
|---|---|
| **Manter** | |
| **Remover** | |
| **Modificar** | |
| **Notas** | Core de afiliados; Beeviral = SC/opcional. |

## Status

`documentado` — aguardando definição de escopo OSS.
