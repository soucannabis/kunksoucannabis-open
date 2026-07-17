# Referência — Observabilidade de erros (Kunk open-source)

## Banco de dados

- Conexão: `DATABASE_URL` do `kunk-api` (mesmo Postgres do app)
- Migration: `project-tools/sql/alter-system-errors.sql`
- Tabela de eventos: `system_errors`
- Tabela de resoluções: `system_error_resolutions` (chave: `error_hash`)

Docs: [`project-tools/docs/api/system-errors.md`](../../../project-tools/docs/api/system-errors.md)

## Agrupamento

Erros são agrupados por `error_hash` (SHA-256 de `message|file_name|lineno|code|source`).

## API (Admin)

Base: `/api/v1` (sessão Administrador nas rotas `/admin/...`).

| Endpoint | Uso |
|----------|-----|
| `GET /admin/system-errors/summary` | Totais em aberto / 24h / 7d |
| `GET /admin/system-errors/top?period=30d` | Grupos mais frequentes |
| `GET /admin/system-errors?limit=50` | Eventos individuais |
| `GET /admin/system-errors/:errorHash/samples` | Amostras de um grupo |
| `POST /admin/system-errors/resolve` | Marcar grupo (`error_hash`, `status`) |
| `POST /system-errors` | Ingestão pública (frontends; rate-limit) |

UI: Admin → **Erros do sistema** (`/erros-sistema`).

## Triagem (skill)

A Fase 1 gera relatório a partir dos grupos em aberto. Preferir a UI Admin ou a API `top`/`summary`.

Para snapshot JSON (Fase 1), consultar via API autenticada ou SQL:

```sql
SELECT e.error_hash, MAX(e.message) AS message, MAX(e.source) AS source,
       MAX(e.app) AS app, COUNT(*)::int AS count, MAX(e.date_created) AS last_seen
FROM system_errors e
LEFT JOIN system_error_resolutions r ON r.error_hash = e.error_hash
WHERE e.date_created >= NOW() - INTERVAL '30 days'
  AND COALESCE(r.status, 'open') = 'open'
GROUP BY e.error_hash
ORDER BY count DESC;
```

Para marcar resolvido (Fase 2, após aprovação explícita):

```http
POST /api/v1/admin/system-errors/resolve
{ "error_hash": "...", "status": "fixed" }
```

## Falsos positivos conhecidos

- Validação 4xx (`AppError`) — **não** deve ser gravada
- Coleta em `localhost` — bloqueada no client (`packages/api-client/src/systemErrors.js`)
- Deduplicação client ~60s por hash

## Arquivos de código relevantes

| Área | Caminho |
|------|---------|
| Service | `kunk-api/src/services/systemErrorsService.js` |
| Ingestão | `kunk-api/src/routes/systemErrors.js` |
| Admin routes | `kunk-api/src/routes/systemErrorsAdmin.js` |
| errorHandler | `kunk-api/src/middleware/errorHandler.js` |
| Client report | `packages/api-client/src/systemErrors.js` |
| UI Admin | `apps/admin/src/pages/ErrosSistemaPage.jsx` |

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

Só marcar `resolved` no meta **depois** de confirmar gravação no banco — e **somente** com aprovação explícita do usuário.
