# Kunk API — Documentação

> Especificação da **nova API REST** do Kunk open source.
> Substitui o Directus como camada de dados e autenticação.
> Status: **em implementação** — pacote [`kunk-api/`](../../../kunk-api/).

## Índice

| Documento | Conteúdo |
|---|---|
| [architecture.md](./architecture.md) | Visão geral, camadas, princípios |
| [authentication.md](./authentication.md) | Sessão (frontend) + Bearer (API) |
| [authorization.md](./authorization.md) | RBAC, roles, permissões por collection |
| [items.md](./items.md) | CRUD genérico `/items/:collection` (estilo Directus) |
| [query-parameters.md](./query-parameters.md) | `filter`, `sort`, `fields`, `limit`, `meta` |
| [collections.md](./collections.md) | Collections permitidas e notas de domínio |
| [domain-routes.md](./domain-routes.md) | Rotas de negócio (orders, services, auth…) |
| [doc-sign.md](./doc-sign.md) | Termos e assinaturas nativos (substitui DocuSeal) |
| [files.md](./files.md) | Upload, download e metadados de arquivos |
| [files-cloud-storage.md](./files-cloud-storage.md) | Drivers local / S3 / GCS + migração + lock |
| [storage-s3-setup.md](./storage-s3-setup.md) | Como criar bucket S3 privado + IAM + credenciais |
| [storage-gcs-setup.md](./storage-gcs-setup.md) | Como criar bucket GCS privado + service account |
| [modules.md](./modules.md) | Módulos opcionais (Loggi, Pagar.me, Pedidos SouCannabis, etc.) |
| [modules/credentials.md](./modules/credentials.md) | Tabela `system_api_credentials` + política de secrets |
| [modules/loggi.md](./modules/loggi.md) | Cotação, etiqueta, teste Loggi |
| [modules/melhorenvio.md](./modules/melhorenvio.md) | Cotação Correios, OAuth, etiqueta, teste ME |
| [modules/pagarme.md](./modules/pagarme.md) | Checkout, recipients, webhooks, split |
| [modules/soucannabis_orders.md](./modules/soucannabis_orders.md) | Cliente API externa SC + sync de pedidos |
| [errors.md](./errors.md) | Formato de erros e códigos |
| [system-errors.md](./system-errors.md) | Observabilidade nativa (`system_errors`) |
| [web-vitals.md](./web-vitals.md) | Core Web Vitals (`web_vitals`) |
| [cache.md](./cache.md) | Memory cache operacional + flag Admin |
| [migration-from-directus.md](./migration-from-directus.md) | Mapa Directus / kunkserver → nova API |
| [openapi.yaml](./openapi.yaml) | Esboço OpenAPI 3.0 |

## Base URL

```
https://{host}/api/v1
```

Em desenvolvimento local (proposta):

```
http://localhost:8056/api/v1
```

## Autenticação (resumo)

| Cliente | Método | Header / Cookie |
|---|---|---|
| Painel / Cadastro (browser) | Sessão | Cookie `kunk_oss_session` (HttpOnly, operador) / `associate_session` (associado) |
| Integrações / scripts | API Key | `Authorization: Bearer <token>` |

Detalhes em [authentication.md](./authentication.md).

## Collections do schema alvo

Fonte: [`../directus/target-schema/README.md`](../directus/target-schema/README.md) e [`../../sql/target-schema.sql`](../../sql/target-schema.sql).

`users`, `system_users`, `orders`, `orders_files`, `institutional_clients`, `products`, `professionals`, `reception`, `reports`, `services`, `services_files`, `tags`, `users_api`, `users_files`, `files`

## Relação com o manifesto

Alinha ao [MANIFESTO.md](../../../MANIFESTO.md) §3.1 e §3.1.3:

- PostgreSQL nativo (sem Directus)
- API REST robusta e padronizada
- Módulos de terceiros desabilitados por padrão

## Frontends

Documentação das apps (estrutura multi-app + cadastramento primeiro):

- [`../funcionalidades/`](../funcionalidades/) — mapa de módulos/páginas + status de testes
- [`../frontend/README.md`](../frontend/README.md)
- [`../frontend/cadastramento/`](../frontend/cadastramento/) — fluxo, campos, UI, requisitos de API e gaps
- Índice geral: [`../README.md`](../README.md)

## Próximos passos (implementação)

1. ~~Aprovar esta documentação~~
2. ~~Implementar auth + `/items` genérico~~ — ver `kunk-api/`
3. Implementar cadastramento + **auth de associado** — ver [`../frontend/cadastramento/`](../frontend/cadastramento/)
4. Adaptar painel em seguida
5. Deprecar `/api/directus/*` após cutover

Rodar testes da API:

```bash
cd kunk-api && npm test
```
