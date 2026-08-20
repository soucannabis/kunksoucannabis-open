# Relatório de serviços (externo / portal do profissional)

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.
> **Spec de implementação OSS:** [`../relatorios-servicos/README.md`](../relatorios-servicos/README.md).

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/relatorio/servicos` |
| **Componente** | `ReportService` |
| **Permissões histórico** | Qualquer autenticado + `?p=` (gate fraco) |
| **Permissões OSS** | Role `Profissional` + `internal_code` = `professional_code` |

## Descrição

Visão do profissional para conferir atendimentos pagos do mês, valor a receber e contestar dados faltantes — fora do shell `/app`.

## Funcionalidades

- Listar serviços vinculados ao próprio profissional (`Pagamento Concluído`)
- Totais de valor a receber
- Contestar (“Estão faltando dados”) → `contest_reports`
- Exportar PDF / logout
- Histórico também: cupons / recipient — **não portar**

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **Auth** | Login + logout |
| **o schema de origem**  | services, professionals |

## Dependências de outras páginas / módulos

- Espelho de `/app/relatorios/servicos`
- Criação de `system_users` no cadastro do profissional
- Admin: taxas por tipo

## Observações

- Histórico redirecionava `Prescritor` para relatório de **pedidos**; no OSS desta entrega o portal de serviços usa role **`Profissional`**.

## Decisão open-source

| Opção | Escolha |
|---|---|
| **Manter** | Portal dedicado, contestações, PDF, agrupamento |
| **Remover** | Acesso só com `?p=` sem login; cupons; recipient |
| **Modificar** | Login obrigatório + escopo RBAC; taxas via admin |
| **Notas** | Spec: [`../relatorios-servicos/`](../relatorios-servicos/README.md) |

## Status

`documentado` — spec OSS pronta para implementação.
