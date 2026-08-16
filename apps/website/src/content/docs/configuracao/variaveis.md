---
title: Variáveis de ambiente
description: Principais envs da API e dos apps.
---

## API (`kunk-api/.env`)

Variáveis centrais (veja `.env.example` completo no pacote):

| Variável | Função |
|---|---|
| `PG_URL` ou `PGHOST`/`PG*` | Conexão PostgreSQL |
| `PORT` | Porta HTTP da API |
| `CORS_ORIGIN` | Origens permitidas (apps locais/produção) |
| `COOKIE_SECURE` | Cookies seguros (HTTPS) |
| `SESSION_MAX_HOURS` | Duração da sessão |
| `STORAGE_PATH` | Storage local de arquivos |
| `FILES_DRIVER` | `local` \| `s3` \| `gcs` |
| `CONFIG_ENCRYPT_KEY` | Criptografia de configs sensíveis |
| `PUBLIC_API_URL` | URL pública (OAuth / webhooks) |

Credenciais de módulos externos (Pagar.me, Loggi, Google, etc.) são **fallback**; a ativação oficial é via Admin → serviços externos / `system_configs`.

## Frontends

Cada app em `apps/*` usa `.env` / Vite (`VITE_*`) para apontar à API. No Docker unificado, `VITE_API_PROXY_TARGET` costuma apontar para o serviço `kunk-api`.

Documentação detalhada de módulos: [API → Módulos](/api/modules/).
