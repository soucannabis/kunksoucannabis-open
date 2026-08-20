# Relatórios — serviços (staff)

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.
> Fonte: `kunksoucannabis`.
> **Spec de implementação OSS:** [`../relatorios-servicos/README.md`](../relatorios-servicos/README.md).

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/app/relatorios/servicos` |
| **Componente** | `ReportService` |
| **Arquivo legado** | `src/components/master/reportServices.jsx` |
| **Permissões** | Administrador | Acolhimento | Produção | Financeiro (via `role_pages`) |

## Descrição

Mesmo componente de `/relatorio/servicos`, dentro do Theme com gate de staff: visão completa por mês/profissional para fechamento de pagamento.

## Funcionalidades

- Listar serviços `Pagamento Concluído` agrupados por mês e profissional
- Filtrar mês / profissional; totais de valor a receber
- Aprovar / contestar linhas (`commission_validation`)
- Ver e resolver contestações (`contest_reports`)
- Exportar PDF
- Ver [Relatório de serviços (externo)](./relatorio-servicos-externo.md)

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **Directus** (legado) | services, professionals |
| **Utalk** (legado) | Ao resolver contestação — **não portar no OSS v1** |
| **n8n** (legado) | Botão Pagamento — **não portar** |

## Dependências de outras páginas / módulos

- Profissionais / Serviços
- Admin: tipos + taxas
- Conta `system_users` (portal)

## Observações

- Relatório de **pedidos** é módulo separado (fora desta entrega).

## Decisão open-source

| Opção | Escolha |
|---|---|
| **Manter** | Layout, agrupamento, filtros, PDF, validation, contestações |
| **Remover** | Cupons, recipient, webhook pagamento, Utalk, bônus tags |
| **Modificar** | Taxas configuráveis (default 0); role `Profissional`; login obrigatório no portal |
| **Notas** | Spec completa em [`../relatorios-servicos/`](../relatorios-servicos/README.md) |

## Status

`documentado` — spec OSS pronta para implementação.
