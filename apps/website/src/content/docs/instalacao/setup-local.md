---
title: Setup local
description: Como subir API e apps no ambiente de desenvolvimento.
---

## 1. Clonar e instalar

```bash
git clone https://github.com/soucannabis/kunksoucannabis-open.git
cd kunksoucannabis-open
npm install
```

## 2. Banco e API

```bash
cd kunk-api
cp .env.example .env
# Ajuste PG_URL ou PGHOST/PGUSER/PGPASSWORD/PGDATABASE
npm install
npm run dev
```

Health check (npm): `http://localhost:8056/api/v1/health`  
Com Docker da API: `http://localhost:4250/api/v1/health`

Dados de exemplo:

```bash
npm run seed:sample --prefix kunk-api
```

Detalhes: documentação da [API](/api/) e o README em `kunk-api/`.

## 3. Frontends

No root do monorepo:

```bash
npm run dev:registration   # cad — :4255
npm run dev:admin          # admin — :4256
npm run dev:kunk           # app — :4257
npm run dev:doc-sign       # termos — :4258
```

Garanta `CORS_ORIGIN` na API incluindo as origens locais dos apps.

## 4. Este site de documentação

```bash
npm run dev:website
```

Abre em `http://localhost:4260`.

## Stack Docker unificado

Para API + Admin + App juntos, veja [Deploy / Docker](/instalacao/deploy/).
