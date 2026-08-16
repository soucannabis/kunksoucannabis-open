# @kunk/website

Site institucional e documentação do **Kunk Open Source** (Astro + Starlight).

## Desenvolvimento

Na raiz do monorepo:

```bash
npm install
npm run dev:website
```

Abre em [http://localhost:4260](http://localhost:4260) com **hot reload**:

- CSS / páginas em `src/` → HMR do Vite/Astro
- Markdown em `project-tools/docs/` → sync automático + reload
- Docs curadas em `src/content/docs/{introducao,instalacao,...}` → reload direto

Use sempre `http://localhost:4260` (não a build em `dist/`) para ver as mudanças.

## Sync da documentação técnica

```bash
npm run sync-docs -w @kunk/website
```

Copia `api/`, `frontend/` e `funcionalidades/` de `project-tools/docs` para o content layer do Starlight (README → index, frontmatter automático). Material de Directus / migração do stack anterior **não** é publicado no site.
