# Prescritores

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.
> Fonte: `kunksoucannabis`.

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/app/prescritores` |
| **Componente** | `PrescribersPage` |
| **Arquivo legado** | `src/components/master/PrescribersPage.jsx` |
| **Permissões** | Administrador | Acolhimento | Produção |

## Descrição

Ranking e CRUD de prescritores (professionals), com pedidos e serviços vinculados.

## Funcionalidades

- Ranking paginado
- CRUD de profissionais
- Ver pedidos e serviços do prescritor
- CreateRecipientModal → recebedor Pagar.me (split de pagamento)

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **Directus** | professionals ranking/CRUD; orders/services by professional |
| **Pagar.me** | recipients / split |

## Dependências de outras páginas / módulos

- Serviços
- Pedidos
- Relatórios externos
- Cupons

## Observações

- —

## Decisão open-source

> Preencher na revisão de escopo.

| Opção | Escolha |
|---|---|
| **Manter** | |
| **Remover** | |
| **Modificar** | |
| **Notas** | Core no domínio cannabis medicinal; Pagar.me recipients = módulo. |

## Status

`documentado` — aguardando definição de escopo OSS.
