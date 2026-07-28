# Roadmap de funcionalidades (protótipo)

Árvore Admin → Kunk → Sistema de cadastro → Doc-sign com checkboxes, **IDs únicos de teste** e execução:

- **e2e** → botão play (verde limão) abre **Playwright UI**
- **API / unit** → play gera relatório JSON + modal; “Ver relatório” se já existir

## Abrir (obrigatório usar o server)

Na raiz do monorepo:

```bash
npm run checklist
```

http://127.0.0.1:4178

Equivalente: `node project-tools/roadmap/server.mjs`

## IDs para agentes

Cada suite tem id estável, ex.:

- `e2e.admin.aparencia`
- `api.admin.storage`
- `api.admin.backups`

Definidos em `data/test-registry.json` (chave = `featureId` da árvore).

## Relatórios API

Salvos em `data/results/<testId>.json` (gitignored).

## Specs novos (roadmap)

Criados/ajustados sob `apps/*/e2e/roadmap/` e `triage.spec.js` dividido por subpágina.

Ver também [AUDIT.md](./AUDIT.md).
