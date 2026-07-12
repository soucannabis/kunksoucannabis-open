# Referência — Observabilidade de erros (Kunk)

## Banco de dados

- Conexão: variável `VITALS_PSQL` no `.env` do `kunkserver`
- Tabela de eventos: `system_errors`
- Tabela de resoluções: `system_error_resolutions` (chave: `error_hash`)

## Agrupamento

Erros são agrupados por `error_hash` (SHA-256 de `message|file_name|lineno`).

## API (Webmaster)

| Endpoint | Uso |
|----------|-----|
| `GET /api/system-errors/summary` | Totais em aberto |
| `GET /api/system-errors/top?period=30d` | Grupos mais frequentes |
| `GET /api/system-errors?limit=50` | Eventos individuais |
| `POST /api/system-errors/resolve` | Marcar grupo resolvido (`error_hash`) |

## Scripts CLI (skill)

Executar a partir de `kunkserver/`.

**Fase 1 (triagem):** apenas `list-open-errors.js`.

**Fase 2 (após aprovação explícita do usuário):** `mark-errors-resolved.js` e `verify-errors-resolved.js`.

```bash
# Fase 1 — listar erros em aberto
node scripts/observability/list-open-errors.js --period 30d --out ../.cursor/skills/kunk-system-errors/work/open-errors.json

# Fase 2 — somente após aprovação do usuário
node scripts/observability/mark-errors-resolved.js --meta ../.cursor/skills/kunk-system-errors/work/system-errors-triage.meta.json --status fixed
node scripts/observability/verify-errors-resolved.js --meta ../.cursor/skills/kunk-system-errors/work/system-errors-triage.meta.json
```

## Falsos positivos conhecidos

- Logs de auditoria `logger.post` com substring `err` no texto (ex.: e-mails) — corrigido em `observabilityLogger.js`
- Nomes inválidos em atividade (`Fetch`, `Kunk`, `Loggi`) — filtrados por `kunkUsersRegistry.js`
- Coleta em `localhost` — bloqueada em `observabilityClient.js`

## Arquivos de código relevantes

| Área | Caminho |
|------|---------|
| Persistência de erros | `kunkserver/routes/modules/systemErrorsDb.js` |
| Logger backend | `kunkserver/routes/logger.js` |
| Coleta via API | `kunkserver/routes/logMiddleware.js` |
| UI Webmaster | `src/components/master/systemErrorsSection.jsx` |
| Erros frontend | `src/App.jsx` |

## Formato do meta JSON

```json
{
  "triage_id": "2026-07-07T12:00:00Z",
  "period": "30d",
  "approval_status": "awaiting_user",
  "items": [
    {
      "error_hash": "abc...",
      "message": "texto do erro",
      "source": "backend",
      "status": "analyzed",
      "title": "Título curto para o relatório",
      "user_approved": false
    }
  ]
}
```

Status do item: `analyzed` (Fase 1) → `fixed` (Fase 2, após aplicar) → `resolved` (Fase 2, após gravar no banco).

`approval_status`: `awaiting_user` | `approved` | `partially_approved`

Só marcar `resolved` no meta **depois** de `mark-errors-resolved.js` confirmar gravação no banco — e **somente** com aprovação explícita do usuário.
