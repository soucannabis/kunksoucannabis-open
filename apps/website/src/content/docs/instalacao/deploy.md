---
title: Deploy / Docker
description: Stack unificado com Docker Compose e notas de deploy.
---

## Compose unificado

O arquivo `docker-compose.kunk.yml` sobe a API e os frontends principais com hot reload:

```bash
# na raiz do repositório
cp kunk-api/.env.example kunk-api/.env   # se ainda não tiver
# configure Postgres e secrets no .env da API

npm run docker:kunk
# ou: docker compose -f docker-compose.kunk.yml up --build
```

Serviços típicos:

- API em `:4250`
- Admin em `:4256`
- App Kunk em `:4257`

Há também composes por app em `apps/*/docker-compose.yml` e scripts `npm run docker:*` no root.

## Produção

O caminho de produção depende do provedor (ex.: Railway). Em linhas gerais:

1. Provisionar PostgreSQL
2. Publicar `kunk-api` com variáveis de ambiente e `PUBLIC_API_URL`
3. Publicar cada frontend com proxy/API apontando para a API
4. Configurar storage (`local` / S3 / GCS) no Admin
5. Rodar o assistente de instalação do Admin na primeira subida, se aplicável

Veja também [variáveis de ambiente](/configuracao/variaveis/) e [instância](/configuracao/instancia/).
