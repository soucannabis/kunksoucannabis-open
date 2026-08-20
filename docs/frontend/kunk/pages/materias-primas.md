# Matérias-primas

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/app/loja/materias-primas` |
| **Componente** | `MateriasPrimas` |
| **Permissões** | Administrador | Acolhimento | Produção |

## Descrição

Consulta de estoque de extratos (`item_type=extrato`) com quantidade > 0.

## Funcionalidades

- Listar/buscar por lote
- Totalizar estoque
- Refresh da consulta

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **SCP** | `/api/scp/stock-items` |

## Dependências de outras páginas / módulos

- Produtos
- Pedidos

## Observações

- —

## Decisão open-source

> Preencher na revisão de escopo.

| Opção | Escolha |
|---|---|
| **Manter** | |
| **Remover** | |
| **Modificar** | |
| **Notas** | Core produção; depende de SCP (avaliar se genérico no OSS). |

## Status

`documentado` — aguardando definição de escopo OSS.
