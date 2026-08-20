# Prescritores / Profissionais

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.
> **Gestão OSS:** [`../servicos/admin.md`](../servicos/admin.md) · rota `/app/profissionais`.

## Identificação

| Campo | Valor |
|---|---|
| **Rota legada** | `/app/prescritores` |
| **Rota OSS** | `/app/profissionais` |
| **Permissões** | Administrador | Acolhimento | Produção |

## Descrição

Mesma tabela `professionals`, dois papéis:

- **Colaboradores** (`is_collaborator`) — atendimento da associação; aparecem em Serviços; agenda secundária Google.
- **Prescritores** (`is_prescriber`) — emitem receitas usadas em pedidos; podem ser da associação ou cadastrados a partir de receita que o associado apresentou (sem contato com o médico).

## Funcionalidades legadas

- Ranking paginado / CRUD
- Flag colaborador (“Mostrar em Serviços”)
- CreateRecipientModal → Pagar.me (não portar)

## Decisão open-source

| Opção | Escolha |
|---|---|
| **Manter** | Uma tabela; flags colaborador + prescritor; filtros claros na UI |
| **Remover** | Ranking Pagar.me / CreateRecipientModal |
| **Modificar** | Página **Profissionais** com chips Todos / Colaboradores / Prescritores / Ambos; agenda secundária no dialog |
| **Notas** | [`../servicos/`](../servicos/README.md) |

## Status

`especificado` — coberto pela spec de Serviços.
