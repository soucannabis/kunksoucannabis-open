---
name: kunk-system-errors
description: >-
  Triagem de erros em aberto do PostgreSQL do Kunk (system_errors no DATABASE_URL).
  Lista grupos no banco/API Admin, analisa causas no código e gera relatório
  markdown detalhado para aprovação do usuário. Não corrige código nem marca
  erros como resolvidos sem aprovação explícita. Use quando o usuário pedir
  triagem de erros, analisar system_errors, relatório de erros do Admin, ou
  executar /kunk-system-errors.
---

# Triagem de erros — Kunk SouCannabis

## Objetivo

Gerar um **relatório markdown detalhado** para o usuário revisar e aprovar.

**A skill NÃO corrige código, NÃO altera o sistema e NÃO marca erros como resolvidos no banco** até o usuário aprovar explicitamente o plano.

## Pré-requisitos

- `DATABASE_URL` configurado no `.env` do `kunk-api` (tabelas `system_errors` / `system_error_resolutions` aplicadas)
- Trabalhar a partir da raiz do repositório
- Preferir listagem via Admin (`/erros-sistema`) ou `GET /api/v1/admin/system-errors/top` — ver [reference.md](reference.md)

## Caminhos fixos

| Artefato | Caminho |
|----------|---------|
| Relatório (entrega principal) | `.cursor/skills/kunk-system-errors/work/system-errors-triage.md` |
| Meta (hashes/status) | `.cursor/skills/kunk-system-errors/work/system-errors-triage.meta.json` |
| Snapshot do banco | `.cursor/skills/kunk-system-errors/work/open-errors.json` |
| Template | [templates/report-template.md](templates/report-template.md) |
| Referência | [reference.md](reference.md) |

---

## Fase 1 — Triagem e relatório (execução padrão)

Ao invocar `/kunk-system-errors`, execute **somente** esta fase e **pare**.

```
- [ ] 1. Listar erros em aberto no banco
- [ ] 2. Analisar todos os grupos (código + amostras)
- [ ] 3. Gerar system-errors-triage.md + .meta.json
- [ ] 4. Apresentar resumo ao usuário e AGUARDAR aprovação
```

### Passo 1 — Listar erros em aberto

Consultar grupos em aberto (período 30d) via API Admin ou SQL — ver [reference.md](reference.md).

Salvar o resultado em `.cursor/skills/kunk-system-errors/work/open-errors.json` no formato:

```json
{
  "total_groups": 1,
  "period": "30d",
  "groups": [
    {
      "error_hash": "...",
      "message": "...",
      "source": "backend",
      "app": "api",
      "count": 3,
      "last_seen": "...",
      "samples": []
    }
  ]
}
```

Se `total_groups` for 0, informe o usuário e encerre.

### Passo 2 — Analisar cada grupo

Para cada entrada em `open-errors.json`:

1. Ler `message`, `source`, `file_name`, `lineno`, `stack_trace` e `samples`
2. Localizar origem no código (`Grep` / leitura de arquivos)
3. Classificar:
   - **Bug real** — descrever correção proposta (sem implementar)
   - **Falso positivo** — descrever ajuste proposto na coleta/logger
   - **Ruído histórico** — justificar por que pode ser marcado como resolvido

Consulte [reference.md](reference.md) para padrões conhecidos.

### Passo 3 — Gerar relatório

1. Criar `work/system-errors-triage.meta.json`:

```json
{
  "triage_id": "<ISO8601>",
  "period": "30d",
  "approval_status": "awaiting_user",
  "items": [
    {
      "error_hash": "<hash>",
      "message": "<mensagem>",
      "source": "frontend|backend|resource",
      "status": "analyzed",
      "title": "Título curto",
      "user_approved": false
    }
  ]
}
```

2. Criar `work/system-errors-triage.md` seguindo [templates/report-template.md](templates/report-template.md).

Para **cada erro**, documentar com detalhe:

| Seção | Conteúdo |
|-------|----------|
| **Diagnóstico** | Por que ocorre, com referência a arquivos/linhas |
| **Impacto** | Quem é afetado, frequência, telas envolvidas |
| **Resolução proposta** | O que mudar (código, config, ou só marcar resolvido) — **proposta, não aplicada** |
| **Risco da correção** | Baixo/médio/alto e efeitos colaterais possíveis |
| **Verificação sugerida** | Passos para validar após aplicar |
| **Recomendação** | `corrigir` / `marcar_resolvido` / `investigar_mais` |

3. Incluir no final do `.md` a seção **Aguardando sua aprovação** com:
   - Caminho do relatório
   - Lista resumida das ações propostas
   - Pergunta explícita: *"Posso aplicar as correções e marcar os itens aprovados como resolvidos no banco?"*

4. Atualizar `approval_status: "awaiting_user"` no meta.

### Passo 4 — Parar e consultar o usuário

Mensagem final obrigatória (adaptar ao conteúdo):

> Relatório gerado em `.cursor/skills/kunk-system-errors/work/system-errors-triage.md`.
> Revise o diagnóstico e as resoluções **propostas**. Nada foi alterado no código nem no banco.
> Após sua aprovação (total ou por item), posso executar a Fase 2.

**Encerrar a execução aqui.** Não avance para a Fase 2 sem resposta afirmativa do usuário.

---

## Fase 2 — Aplicação (somente após aprovação explícita)

Executar **apenas** quando o usuário disser claramente que aprova, por exemplo:

- "Aprovado, pode corrigir"
- "Aplique as correções do relatório"
- "Marque como resolvidos os itens X e Y"

Se o usuário aprovar **parcialmente**, aplicar somente os itens indicados.

```
- [ ] 5. Implementar correções aprovadas
- [ ] 6. Rodar testes (se backend alterado)
- [ ] 7. Marcar resolvidos no banco (itens aprovados)
- [ ] 8. Verificar resolução no banco
- [ ] 9. Atualizar relatório e meta
- [ ] 10. Remover artefatos (se usuário confirmar conclusão)
```

### Passo 5 — Implementar correções aprovadas

- Alterar **somente** o que o usuário aprovou
- Atualizar no meta: `user_approved: true`, `status: "fixed"` nos itens aplicados
- Itens não aprovados permanecem `status: "analyzed"`

### Passo 6 — Testes

Se houve mudança no backend: `cd kunk-api && npm test`

### Passo 7 — Marcar resolvidos no banco

Somente itens com `user_approved: true` e `status: "fixed"`:

Para cada `error_hash`, chamar:

```http
POST /api/v1/admin/system-errors/resolve
{ "error_hash": "<hash>", "status": "fixed" }
```

(requer sessão Administrador). Alternativa: `UPDATE system_error_resolutions` / upsert conforme [reference.md](reference.md).

Depois de sucesso, atualizar esses itens para `status: "resolved"` no meta.

### Passo 8 — Verificar

Reconsultar `GET /api/v1/admin/system-errors/top?period=30d` (ou SQL) e confirmar que os hashes aprovados não aparecem mais como `open`.

### Passo 9 — Atualizar relatório

Adicionar seção **Execução** no `.md` com o que foi feito e o que ficou pendente.

### Passo 10 — Remover artefatos

Remover arquivos de triagem **somente** se o usuário confirmar que a triagem está concluída:

```bash
rm -f .cursor/skills/kunk-system-errors/work/system-errors-triage.md
rm -f .cursor/skills/kunk-system-errors/work/system-errors-triage.meta.json
rm -f .cursor/skills/kunk-system-errors/work/open-errors.json
```

---

## Regras invioláveis

1. **Nunca** alterar código na Fase 1
2. **Nunca** marcar erros como resolvidos no banco na Fase 1
3. **Nunca** remover o `.md` antes da aprovação e execução da Fase 2
4. **Nunca** assumir aprovação implícita — exigir confirmação explícita
5. Se houver dúvida sobre um item, perguntar antes de agir
6. Respostas ao usuário em português
7. O relatório `.md` é o artefato principal para decisão do usuário

## Comandos do usuário

| Comando | Ação |
|---------|------|
| `/kunk-system-errors` | Fase 1 apenas (relatório para aprovação) |
| "Aprovado, aplicar" | Fase 2 conforme relatório |
| "Aprovar apenas item 2" | Fase 2 parcial |
