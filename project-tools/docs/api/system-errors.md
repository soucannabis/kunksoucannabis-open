# System errors — observabilidade nativa

Persistência de erros inesperados do backend (`kunk-api`) e dos frontends (kunk, admin, registration, doc-sign) no **mesmo Postgres** do app (`DATABASE_URL`).

## Schema

Migration: [`../../sql/alter-system-errors.sql`](../../sql/alter-system-errors.sql)  
Também em [`../../sql/target-schema.sql`](../../sql/target-schema.sql).

| Tabela | Papel |
|---|---|
| `system_errors` | Eventos individuais |
| `system_error_resolutions` | Status por `error_hash` (`open` / `fixed` / `ignored`) |

Agrupamento: `error_hash = SHA-256(message|file_name|lineno|code|source)`.

## O que é gravado

- Backend: erros 500 / não mapeados no `errorHandler`; `uncaughtException` / `unhandledRejection`
- Frontend: `window.onerror`, `unhandledrejection`, React ErrorBoundary, e `showError` (kunk) quando `ApiError` ≥ 500
- **Não** grava `AppError` 4xx de validação/negócio
- Client **não** envia em `localhost` / `127.0.0.1`

## Endpoints

Base: `/api/v1`

| Método | Path | Auth | Uso |
|---|---|---|---|
| POST | `/system-errors` | Público (rate-limit) | Ingestão frontend |
| GET | `/admin/system-errors/summary` | Administrador | Totais |
| GET | `/admin/system-errors/top?period=30d` | Administrador | Grupos |
| GET | `/admin/system-errors` | Administrador | Eventos |
| GET | `/admin/system-errors/:errorHash/samples` | Administrador | Amostras |
| POST | `/admin/system-errors/resolve` | Administrador | `{ error_hash, status, note? }` |

### POST `/system-errors` (body)

```json
{
  "source": "frontend",
  "app": "kunk",
  "message": "Cannot read properties of null",
  "code": "FRONTEND_ERROR",
  "stack_trace": "...",
  "file_name": "...",
  "lineno": 12,
  "url": "https://..."
}
```

### POST `/admin/system-errors/resolve`

```json
{ "error_hash": "<64 hex>", "status": "fixed", "note": "corrigido em …" }
```

`status`: `open` | `fixed` | `ignored`.

## UI

Admin → **Erros do sistema** (`/erros-sistema`): resumo, top grupos, amostras, marcar resolvido/ignorar.

## Código

| Área | Caminho |
|---|---|
| Service | `kunk-api/src/services/systemErrorsService.js` |
| Ingestão | `kunk-api/src/routes/systemErrors.js` |
| Admin | `kunk-api/src/routes/systemErrorsAdmin.js` |
| Hook 500 | `kunk-api/src/middleware/errorHandler.js` |
| Client | `packages/api-client/src/systemErrors.js` |
| UI | `apps/admin/src/pages/SystemErrorsPage.jsx` |
