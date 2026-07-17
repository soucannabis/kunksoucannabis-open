# Mapa de funcionalidades

> Inventário das funcionalidades implementadas nos apps e na API.
> Objetivo: visão rápida do que existe, em qual página opera e se já há testes.
> Detalhes técnicos ficam em [`../frontend/`](../frontend/) e [`../api/`](../api/).

**Última atualização:** 2026-07-17

## Como ler

| Coluna | Significado |
|---|---|
| **Página** | Rota relativa no app (ou endpoint de domínio na API) |
| **Descrição** | O que faz, em poucas palavras |
| **Testes** | `Sim` · `Parcial` · `Não` — npm (unit/integration/Vitest) e/ou Playwright e2e |

## Apps

| Superfície | Pasta | Porta dev | Documento |
|---|---|---|---|
| **Cadastramento** | `apps/registration` | 4255 | [registration.md](./registration.md) |
| **Admin** | `apps/admin` | 4256 | [admin.md](./admin.md) |
| **Kunk** (operacional) | `apps/kunk` | 4257 | [kunk.md](./kunk.md) |
| **Doc-sign** | `apps/doc-sign` | 4258 | [doc-sign.md](./doc-sign.md) |
| **API** (backend) | `kunk-api` | 4250 | [kunk-api.md](./kunk-api.md) |

## Resumo de cobertura de testes

| Superfície | npm / Vitest | Playwright e2e | Avaliação geral |
|---|---|---|---|
| Registration | Não | Sim (funil + shell + storage) | Boa no e2e |
| Admin | Não | Sim (núcleo + páginas de config/ops) | Boa no e2e (smoke) |
| Kunk | Parcial (rotas/menu/helpers) | Sim (auth/shell/páginas/storage) | Boa no e2e (smoke) |
| Doc-sign | Não | Sim (auth/modelos/termos/storage) | Média-boa |
| kunk-api | Sim (domínio + admin infra) | — (via e2e dos apps) | Boa |

> Specs novos criados em 2026-07-17 ainda **não foram executados** nesta sessão — validar com os comandos abaixo.

## Comandos úteis

```bash
npm run test:api              # kunk-api
npm run test:kunk             # Vitest apps/kunk
npm run test:e2e              # registration
npm run test:e2e:admin
npm run test:e2e:kunk
npm run test:e2e:doc-sign
```
