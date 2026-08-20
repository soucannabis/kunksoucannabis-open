# Carrinho (rota top-level)

> Documentação funcional da página legada.

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/cart` |
| **Componente** | `Cart` |
| **Permissões** | **Nenhuma** no App.jsx (risco de segurança) |

## Descrição

Mesmo checkout de `/app/loja/novo-pedido`, fora do shell Theme e **sem gate de autenticação**.

## Decisão open-source

| Opção | Escolha |
|---|---|
| **Remover** | Não portar `/cart` público |
| **Notas** | Unificar em `/app/loja/novo-pedido` autenticado. Spec: [`../pedidos/README.md`](../pedidos/README.md). |

## Status

`removido do OSS` — usar apenas a rota autenticada.
