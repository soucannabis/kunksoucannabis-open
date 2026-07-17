# Documentação — Kunk Open Source

> Índice da documentação técnica do produto unificado.
> Intenção de produto: [`MANIFESTO.md`](../../MANIFESTO.md).

## Áreas

| Área | Pasta | Status |
|---|---|---|
| **Mapa de funcionalidades** | [`funcionalidades/`](./funcionalidades/) | Inventário por app + testes (npm / e2e) |
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
| `termos/` | Doc-sign (termos / assinaturas) | Associados + operadores |

A documentação de frontend descreve a estrutura compartilhada **e** cada app. O primeiro app recriado é o **cadastramento**; o **admin** está em progresso; o **Kunk** operacional vive em `apps/kunk` (docs em [`frontend/kunk/`](./frontend/kunk/)); o **doc-sign** está especificado em [`frontend/doc-sign/`](./frontend/doc-sign/).

## Ordem sugerida de leitura (app Kunk operacional)

1. [`frontend/kunk/README.md`](./frontend/kunk/README.md) — índice de rotas + app novo
2. [`frontend/kunk/removed-from-v1.md`](./frontend/kunk/removed-from-v1.md) — o que saiu do menu v1
3. Páginas principais: [cadastramento](./frontend/kunk/pages/cadastramento.md), [triagem](./frontend/kunk/pages/triagem.md) ([**spec**](./frontend/kunk/triagem/README.md)), [pedidos](./frontend/kunk/pages/pedidos.md) ([**spec carrinho/frete**](./frontend/kunk/pedidos/README.md)), [servicos](./frontend/kunk/pages/servicos.md) ([**spec serviços**](./frontend/kunk/servicos/README.md)), [relatório de serviços](./frontend/kunk/pages/relatorios-servicos.md) ([**spec**](./frontend/kunk/relatorios-servicos/README.md))
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

## Ordem sugerida de leitura (Pagar.me + Pedidos SouCannabis — spec)

1. [`frontend/kunk/pagamentos-soucannabis/README.md`](./frontend/kunk/pagamentos-soucannabis/README.md) — escopo e acoplamento dos dois serviços
2. [`flow.md`](./frontend/kunk/pagamentos-soucannabis/flow.md) → [`fields.md`](./frontend/kunk/pagamentos-soucannabis/fields.md) → [`admin.md`](./frontend/kunk/pagamentos-soucannabis/admin.md)
3. [`api.md`](./frontend/kunk/pagamentos-soucannabis/api.md) + [`ui-ux.md`](./frontend/kunk/pagamentos-soucannabis/ui-ux.md) + [`gaps.md`](./frontend/kunk/pagamentos-soucannabis/gaps.md)
4. Módulos: [`api/modules/pagarme.md`](./api/modules/pagarme.md) · [`api/modules/soucannabis_orders.md`](./api/modules/soucannabis_orders.md)
5. Contrato remoto: [`external_apps_kunk_doc.md`](./external_apps_kunk_doc.md) · Split: [Pagar.me Split](https://docs.pagar.me/reference/split-1)

## Ordem sugerida de leitura (serviços / profissionais / Google Calendar — implementação)

1. [`frontend/kunk/servicos/README.md`](./frontend/kunk/servicos/README.md) — escopo OSS (sem checkout Pagar.me)
2. [`ui-ux.md`](./frontend/kunk/servicos/ui-ux.md) — layout igual ao legado (obrigatório)
3. [`flow.md`](./frontend/kunk/servicos/flow.md) → [`fields.md`](./frontend/kunk/servicos/fields.md) → [`admin.md`](./frontend/kunk/servicos/admin.md)
4. [`api.md`](./frontend/kunk/servicos/api.md) + [`gaps.md`](./frontend/kunk/servicos/gaps.md)
5. Módulo: [`api/modules/google_calendar.md`](./api/modules/google_calendar.md) · [`credentials.md`](./api/modules/credentials.md)

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

## Ordem sugerida de leitura (doc-sign — termos / assinaturas)

1. [`frontend/doc-sign/README.md`](./frontend/doc-sign/README.md) — escopo OSS (substitui DocuSeal)
2. [`flow.md`](./frontend/doc-sign/flow.md) → [`fields.md`](./frontend/doc-sign/fields.md)
3. [`api.md`](./frontend/doc-sign/api.md) + [`ui-ux.md`](./frontend/doc-sign/ui-ux.md) + [`gaps.md`](./frontend/doc-sign/gaps.md)
4. API domínio: [`api/doc-sign.md`](./api/doc-sign.md)
