# Produtos

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.
> Fonte: `kunksoucannabis`.

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/app/loja/produtos` |
| **Componente** | `Products (EditableTable)` |
| **Arquivo legado** | `src/components/master/products.jsx` |
| **Permissões** | Administrador | Acolhimento | Produção |

## Descrição

CRUD inline de produtos do catálogo, com controle de lotes e consulta de estoque.

## Funcionalidades

- Editar código, nome, tipo, preço, lote
- Seleção em massa de lote
- Modal BatchControl (lotes / FIFO)
- Consulta de estoque por código (SCP)

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **Directus** | `/api/directus/products`, `/api/directus/batch-control` |
| **SCP** | `/api/scp/stock-items` |

## Dependências de outras páginas / módulos

- Pedidos
- Novo pedido
- Matérias-primas

## Observações

- Categorias óleo/lotes ≈ domínio cannabis medicinal

## Decisão open-source

> Preencher na revisão de escopo.

| Opção | Escolha |
|---|---|
| **Manter** | |
| **Remover** | |
| **Modificar** | |
| **Notas** | Core catálogo. SCP como módulo/infra opcional. |

## Status

`documentado` — aguardando definição de escopo OSS.
