---
title: Logs
description: Onde observar logs da API e dos containers.
---

## API local

```bash
# processo npm
npm run dev --prefix kunk-api

# Docker
docker compose -f docker-compose.kunk.yml logs -f kunk-api
```

## Apps

Logs do Vite / container de cada frontend (`admin`, `kunk`, `registration`, `doc-sign`) via `docker compose logs -f <serviço>` ou terminal do `npm run dev:*`.

Em produção, agregue logs do runtime (Railway, etc.) e correlacione com [erros do sistema](/operacao/erros/).
