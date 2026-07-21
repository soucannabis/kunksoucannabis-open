# @kunk/admin-docs

Documentação voltada a administradores leigos do **Kunk Admin**.

## Conteúdo

- `content/**/*.md` — artigos em Markdown com frontmatter (fonte reciclável para site estático futuro, ex. VitePress).
- `src/credentialGuides.js` / `src/storageGuides.js` — passos e links oficiais compartilhados com as telas de configuração.
- `src/articles.js` — índice consumido pelo Admin (`react-markdown`).

## Frontmatter

```yaml
---
id: servicos-loggi
title: Loggi
section: servicos-externos
adminPath: /servicos-externos/loggi
keywords: [frete, cotação]
order: 92
---
```
