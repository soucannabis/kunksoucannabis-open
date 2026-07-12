# Template — Triagem de erros do sistema (Kunk)

> Gerado por: skill `kunk-system-errors`  
> Triagem: `{{TRIAGE_ID}}`  
> Período analisado: `{{PERIOD}}`  
> Grupos em aberto: `{{TOTAL_GROUPS}}`  
> **Status:** Aguardando aprovação do usuário — nenhuma alteração foi aplicada

## Resumo executivo

{{EXECUTIVE_SUMMARY}}

| # | Erro | Tipo | Ocorrências | Recomendação |
|---|------|------|-------------|--------------|
{{SUMMARY_TABLE_ROWS}}

---

## Erros (detalhamento)

{{#each ERROR}}
### {{index}}. {{title}}

| Campo | Valor |
|-------|-------|
| `error_hash` | `{{error_hash}}` |
| Origem | {{source}} |
| Ocorrências | {{count}} |
| Primeira vez | {{first_seen}} |
| Última vez | {{last_seen}} |
| Arquivo | {{file_name}}:{{lineno}} |
| Usuários afetados (amostra) | {{affected_users}} |
| Rotas / telas | {{paths}} |

**Mensagem**

```
{{message}}
```

**Stack trace (amostra)**

```
{{stack_trace}}
```

**Diagnóstico**

{{diagnosis}}

**Impacto**

{{impact}}

**Resolução proposta** *(não aplicada)*

{{proposed_resolution}}

**Arquivos prováveis**

{{likely_files}}

**Risco da correção**

{{risk}}

**Verificação sugerida**

{{verification}}

**Recomendação:** `{{recommendation}}` (`corrigir` | `marcar_resolvido` | `investigar_mais`)

---

{{/each}}

## Aguardando sua aprovação

Nenhuma alteração foi feita no código nem no banco de dados.

Revise as **resoluções propostas** acima e responda, por exemplo:

- *"Aprovado, pode aplicar tudo"*
- *"Aprovar apenas os itens 1 e 3"*
- *"Não marcar como resolvido o item 2; quero investigar mais"*

Após sua aprovação explícita, a skill pode executar a **Fase 2** (implementar correções aprovadas e marcar resolvidos no banco).

---

## Execução *(preencher somente na Fase 2, após aprovação)*

| Item | Aprovado? | Aplicado? | Resolvido no banco? | Notas |
|------|-----------|-----------|---------------------|-------|
{{EXECUTION_TABLE_ROWS}}
