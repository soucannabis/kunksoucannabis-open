# Relatórios de serviços — Documentação de implementação

> Reimplementação do relatório de **serviços** (comissões / valores a pagar a profissionais) no produto unificado (`apps/kunk` + `apps/admin` + `kunk-api`).
> **Fora desta entrega:** relatório de pedidos (`reportOrders.jsx`).

## Objetivo

Recriar o fluxo de **relatório de serviços** com:

1. **Mesmo layout e visual** da página legada (filtros mês/profissional, agrupamento, tabela, cores)
2. Listagem **completa** dos serviços com status `Pagamento Concluído`, organizada por **mês** da data de atendimento (`consultation_date`)
3. Filtro por profissional e totais de **valor a receber** para fechamento de pagamento
4. Conta de **usuário do sistema** por profissional (role `Profissional`) com acesso **somente** ao relatório dos próprios dados
5. **Contestações** visíveis no portal do profissional e no painel interno (staff)
6. **Taxas por tipo** + flag **descontar doação** no admin (defaults: fee 0, doação não desconta)
7. Catálogo de **tipos** + **valor padrão de consulta** por tipo
8. **Criar conta** em `/app/profissionais` com convite (link expirável → `/cadastro`); e-mail stub até módulo SMTP
9. Role `Profissional` **nunca** acessa outras páginas do Kunk — só o relatório de pagamento

## Fora de escopo (v1 desta feature)

| Item | Motivo |
|---|---|
| Relatório de pedidos | Explicitamente excluído — só serviços |
| Cupons no portal do profissional | Histórico acoplado a Beeviral / saldo de doação — módulo separado |
| CreateRecipientModal / Pagar.me recipients | Pagamento |
| Webhook n8n “Pagamento” | Específico SouCannabis |
| Utalk / WhatsApp ao resolver contestação | Módulo separado (pode vir depois) |
| Bônus por tags (“Terapeuta Base”, “consulta social”) | Regra SC hardcoded antes — não portar; usar só taxa por tipo |
| Relatórios custom / dashboards (`reports` collection) | Outro módulo |

## Índice

| Documento | Conteúdo |
|---|---|
| [flow.md](./flow.md) | Fluxos: staff · portal profissional · conta · contestação · cálculo |
| [fields.md](./fields.md) | Campos, fórmulas, tipos, validação/contestação |
| [ui-ux.md](./ui-ux.md) | **Layout e visual iguais aversões anteriores** (obrigatório) |
| [admin.md](./admin.md) | Tipos de profissional, taxas, valores padrão, páginas por role |
| [api.md](./api.md) | Contratos `kunk-api` |
| [gaps.md](./gaps.md) | Decisões fechadas + checklist de implementação |

Páginas legadas (inventário curto):

| Documento | Conteúdo |
|---|---|
| [`../pages/relatorios-servicos.md`](../pages/relatorios-servicos.md) | Staff `/app/relatorios/servicos` |
| [`../pages/relatorio-servicos-externo.md`](../pages/relatorio-servicos-externo.md) | Portal `/relatorio/servicos` |

Docs relacionadas:

| Documento | Conteúdo |
|---|---|
| [`../servicos/README.md`](../servicos/README.md) | Serviços + profissionais (origem dos dados) |
| [`../../admin/flow.md`](../../admin/flow.md) | Admin — novas rotas de tipos/taxas |

## Posicionamento

```
apps/kunk  /app/relatorios/servicos     ←── staff (todos os profissionais)
         │ /relatorio/servicos          ←── portal do profissional (só os dele)
         │
         ├── filtros mês / profissional (staff)
         ├── agrupamento mês → profissional → linhas
         ├── totais “valor a receber”
         ├── aprovar / contestar linhas (commission_validation)
         ├── contestação “faltam dados” (contest_reports)
         └── exportar PDF
         │
         ▼
    kunk-api /v1
         ├── /services/reports/*
         ├── /items/services | /items/professionals
         ├── /system-users (criar conta do profissional)
         └── system_configs (professional_types)
         │
         ▼
    PostgreSQL
         ├── services (consultation_date, price, donation, commission_validation, …)
         ├── professionals (contest_reports, professional_code, type, …)
         ├── system_users (role Profissional, internal_code = professional_code)
         └── system_configs (professional_types + report_settings)
         ▲
apps/admin
         ├── /configs/services  ←── tipos + taxas + switch doação
         └── /usuarios/paginas  ←── role Profissional → só relatório
```

## Princípios

| Fazer | Não fazer |
|---|---|
| Replicar layout/agrupamento do `reportServices.jsx` | Inventar dashboard financeiro novo |
| Só `Pagamento Concluído` **com** `consultation_date` | Pendentes ou serviços sem data |
| Agrupar por mês de `consultation_date` | Agrupar por `date_created` |
| `payable` via admin (fee + flag doação) | Hardcode −20/−10 |
| Default OSS: fee 0, doação **não** desconta | Assumir regra SC como default |
| Tipos / taxas / flag no admin | Enum morto no front |
| Conta em Profissionais + `/cadastro` | Portal anônimo só com `?p=` |
| Role `Profissional` **só** relatório | Menu staff / outras páginas Kunk |
| Contestações em `contest_reports` | Só WhatsApp sem persistência |

## Exemplo de configuração (Sou Cannabis — não é default)

| Tipo | `association_fee` | Efeito |
|---|---|---|
| `medic` | `20` | Consulta R$ 220 → pagar R$ 200 |
| `therapist` | `10` | Consulta R$ 110 → pagar R$ 100 |

No OSS, sem configurar taxas, consulta R$ 220 → pagar R$ 220.

## Status desta documentação

`pronta para implementação` — decisões de escopo fechadas (ver [gaps.md](./gaps.md)).
