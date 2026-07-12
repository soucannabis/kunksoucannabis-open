# Triagem (Reception) — Documentação de implementação

> Reimplementação da fila de acolhimento no produto unificado (`apps/kunk` + `apps/admin` + `kunk-api`).
> Referência legada: [`kunksoucannabis` Reception](../../../../kunksoucannabis/src/components/master/reception.jsx).
> Schema alvo: tabela `reception` ([Reception.md](../../directus/collections/Reception.md) + `target-schema.sql`).

## Objetivo

Recriar a triagem operacional com:

1. **Mesma lógica de fila** do legado (lista de `reception`, sidebar de status, redirecionamento para pedidos/serviços)
2. **Sem** Utalk, Beeviral, histórico de doações e demais integrações SC
3. **Formulário público configurável** no admin (campos padrão + personalizados via `system_configs`)
4. **Status configuráveis** no admin (padrão: Espera + Concluído; demais criados pela associação)
5. **Vínculo automático por e-mail** com associado existente
6. **Módulo opcional** de documentos/dados do associado (desabilitado por padrão)

## Fora de escopo (v1 desta feature)

| Item | Motivo |
|---|---|
| Utalk / WhatsApp sync | Integração terceiros — não portar |
| Beeviral (`bvid`) | Específico SouCannabis — não portar |
| Histórico de doações na triagem | Explicitamente excluído |
| Formulário embutido no site WordPress | Substituído por formulário público servido pelo produto (rota/app configurável) |

## Índice

| Documento | Conteúdo |
|---|---|
| [flow.md](./flow.md) | Fluxos: form externo → fila → status → pedidos/serviços |
| [fields.md](./fields.md) | Campos do form, custom fields, statuses, `system_configs` |
| [admin.md](./admin.md) | Área Triagem no admin (form + status + módulo docs) |
| [api.md](./api.md) | Contratos `kunk-api` necessários |
| [ui-ux.md](./ui-ux.md) | Página operacional em `apps/kunk` (layout legado sem Utalk/Beeviral) |
| [gaps.md](./gaps.md) | Decisões fechadas + checklist de implementação |

## Posicionamento

```
Formulário público (associado / lead)
         │  POST /reception (público ou autenticado associado)
         ▼
    reception (status = Espera)
         │
         ▼
apps/kunk  /app/acolhimento/triagem   ←── operadores
         │
         ├── link por email / manual
         ├── pedidos  (só se associate_code)
         └── serviços (só se associate_code)
         │
         ▼
    kunk-api /v1  +  PostgreSQL
         ▲
apps/admin /triagem/*  ←── configs form, status, módulo docs
         │
    system_configs (system = triage)
```

## Princípios

| Fazer | Não fazer |
|---|---|
| Replicar sidebar de status + tabela + contagens | Reinventar o fluxo de acolhimento |
| Guardar form/status/módulo em `system_configs` | Hardcode de campos/status no front |
| Exigir associado linkado para pedidos/serviços | Permitir redirect sem `associate_code` |
| Contabilizar conclusão como no legado (`completion_reason`) | Manter histórico de doações na UI da triagem |
| Módulo docs/dados opcional (default off) | Embutir Utalk/Beeviral |

## Status desta documentação

`proposed` — base para aprovação e implementação da triagem no novo projeto.
