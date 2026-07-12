# Documentação — Kunk Open Source

> Índice da documentação técnica do produto unificado.
> Intenção de produto: [`MANIFESTO.md`](../../MANIFESTO.md).

## Áreas

| Área | Pasta | Status |
|---|---|---|
| **API** | [`api/`](./api/) | Em implementação (`kunk-api/`) |
| **Schema / Directus legado** | [`directus/`](./directus/) | Mapeado; schema alvo proposto |
| **Frontends (apps)** | [`frontend/`](./frontend/) | Cadastramento + admin + app Kunk (`apps/kunk`) |

## Princípio de organização

Um **produto**, uma **API**, um **banco** por instância.

Superfícies distintas por subdomínio/porta (não sistemas separados):

| Subdomínio | App | Público |
|---|---|---|
| `cad/` | Cadastramento | Associados em onboarding |
| `admin/` | Admin da instância | Operadores com role `Administrador` |
| `app/` | Painel interno (operacional) | Operadores (`system_users`) |
| `termos/` | Termos / assinaturas | Associados + operadores |

A documentação de frontend descreve a estrutura compartilhada **e** cada app. O primeiro app recriado é o **cadastramento**; o **admin** está em progresso; o **Kunk** operacional vive em `apps/kunk` (docs em [`frontend/kunk/`](./frontend/kunk/)).

## Ordem sugerida de leitura (app Kunk operacional)

1. [`frontend/kunk/README.md`](./frontend/kunk/README.md) — índice de rotas + app novo
2. [`frontend/kunk/removed-from-v1.md`](./frontend/kunk/removed-from-v1.md) — o que saiu do menu v1
3. Páginas principais: [cadastramento](./frontend/kunk/pages/cadastramento.md), [triagem](./frontend/kunk/pages/triagem.md) ([**spec**](./frontend/kunk/triagem/README.md)), [pedidos](./frontend/kunk/pages/pedidos.md) ([**spec carrinho/frete**](./frontend/kunk/pedidos/README.md)), [servicos](./frontend/kunk/pages/servicos.md)
4. Demais páginas em [`frontend/kunk/pages/`](./frontend/kunk/pages/)

## Ordem sugerida de leitura (triagem — implementação)

1. [`frontend/kunk/triagem/README.md`](./frontend/kunk/triagem/README.md) — escopo OSS
2. [`flow.md`](./frontend/kunk/triagem/flow.md) → [`fields.md`](./frontend/kunk/triagem/fields.md) → [`admin.md`](./frontend/kunk/triagem/admin.md)
3. [`api.md`](./frontend/kunk/triagem/api.md) + [`ui-ux.md`](./frontend/kunk/triagem/ui-ux.md) + [`gaps.md`](./frontend/kunk/triagem/gaps.md)

## Ordem sugerida de leitura (pedidos / carrinho / frete — implementação)

1. [`frontend/kunk/pedidos/README.md`](./frontend/kunk/pedidos/README.md) — escopo OSS
2. [`flow.md`](./frontend/kunk/pedidos/flow.md) → [`fields.md`](./frontend/kunk/pedidos/fields.md) → [`admin.md`](./frontend/kunk/pedidos/admin.md)
3. [`api.md`](./frontend/kunk/pedidos/api.md) + [`ui-ux.md`](./frontend/kunk/pedidos/ui-ux.md) + [`gaps.md`](./frontend/kunk/pedidos/gaps.md)
4. Módulos: [`api/modules/loggi.md`](./api/modules/loggi.md) · [`melhorenvio.md`](./api/modules/melhorenvio.md) · [`credentials.md`](./api/modules/credentials.md)

## Ordem sugerida de leitura (cadastramento)

1. [`frontend/README.md`](./frontend/README.md) — visão das apps
2. [`frontend/structure.md`](./frontend/structure.md) — monorepo / pacotes compartilhados
3. [`frontend/cadastramento/README.md`](./frontend/cadastramento/README.md) — escopo do app
4. Fluxo, campos, UI, API e gaps na pasta [`frontend/cadastramento/`](./frontend/cadastramento/)

## Ordem sugerida de leitura (admin)

1. [`frontend/README.md`](./frontend/README.md) — visão das apps
2. [`frontend/admin/README.md`](./frontend/admin/README.md) — escopo do app
3. [`frontend/admin/flow.md`](./frontend/admin/flow.md) — áreas (dados, configs, usuários)
4. [`frontend/admin/api.md`](./frontend/admin/api.md) + [`frontend/admin/gaps.md`](./frontend/admin/gaps.md)
