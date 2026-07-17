# Web Vitals — métricas de performance

Coleta nativa de Core Web Vitals dos frontends no **mesmo Postgres** do app (`DATABASE_URL`).

## Schema

Migration: [`../../sql/alter-web-vitals.sql`](../../sql/alter-web-vitals.sql)

Tabela `web_vitals`: `name` (LCP|INP|CLS|FCP|TTFB), `value`, `rating`, `app`, `path`, `url`, etc.

## Endpoints

Base: `/api/v1`

| Método | Path | Auth | Uso |
|---|---|---|---|
| POST | `/web-vitals` | Público (rate-limit) | 1 métrica ou array (até 20) |
| GET | `/admin/web-vitals/summary?period=7d` | Administrador | p50/p75/p95 + % good |
| GET | `/admin/web-vitals/series?period=7d&name=LCP` | Administrador | Série temporal |
| GET | `/admin/web-vitals/by-page?period=7d&name=LCP` | Administrador | Piores paths |

### POST body (exemplo)

```json
{
  "name": "LCP",
  "value": 2430.5,
  "rating": "needs-improvement",
  "delta": 2430.5,
  "navigation_type": "navigate",
  "app": "kunk",
  "url": "https://app.example/recepcao",
  "path": "/recepcao",
  "id": "v4-..."
}
```

Client **não** envia em `localhost`.

## UI

Admin → **Web Vitals** (`/web-vitals`).

## Código

| Área | Caminho |
|---|---|
| Service | `kunk-api/src/services/webVitalsService.js` |
| Ingestão | `kunk-api/src/routes/webVitals.js` |
| Admin | `kunk-api/src/routes/webVitalsAdmin.js` |
| Client | `packages/api-client/src/webVitals.js` (`reportWebVital`) + `apps/*/src/lib/installWebVitals.js` (importa `web-vitals`) |
| UI | `apps/admin/src/pages/WebVitalsPage.jsx` |
