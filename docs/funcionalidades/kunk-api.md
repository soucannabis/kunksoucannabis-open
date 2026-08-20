# kunk-api — mapa de módulos e serviços

> Backend REST (`kunk-api`, base `/api/v1`).
> Índice: [README.md](./README.md) · Spec detalhada: [`../api/`](../api/)

**Testes:** `npm run test:api` (`node --test` — unit, integration, contract). 
Não há Playwright na API; e2e dos apps exercitam parte das rotas.

## Domínio (rotas)

| Módulo | Rota principal | Descrição | Testes |
|---|---|---|---|
| Health | `/health` | Liveness | Sim |
| Auth operador | `/auth` | Login, me, tokens, logout, reset | Sim |
| Auth associado | `/auth/associate` | Funil de cadastro | Sim |
| Config | `/config` | `system_configs` | Sim |
| Items CRUD | `/items/:collection` | CRUD genérico whitelist | Sim |
| Users | `/users` | Associados / pacientes | Sim |
| Orders | `/orders` | Pedidos, status, bulk, facets | Sim |
| Freight | `/freight` | Cotação de frete | Sim |
| Products | `/products` | Produtos, estoque, import | Sim |
| Services | `/services` | Serviços / agenda | Sim |
| Reception | `/reception` | Triagem pública e staff | Sim |
| Institutional clients | `/institutional-clients` | Clientes CNPJ | Parcial |
| Professionals | `/professionals` | Profissionais | Sim |
| Reports | `/reports` | Relatórios salvos | Sim |
| Analytics | `/analytics` | Agregados do dashboard | Sim |
| Tags | `/tags` | Etiquetas | Sim |
| System users | `/system-users` | Operadores | Sim |
| Files | `/files` | Upload / download / attach | Sim |
| Search | `/search` | Busca global | Sim |
| Doc-sign | `/doc-sign` | Templates, contratos, sign | Sim |
| Terms | `/terms` | Status / bridge do cadastro | Sim |
| Activity | `/activity` | Histórico do sistema | Sim |
| System errors | `/system-errors` | Report de erros (apps) | Sim |
| Web vitals | `/web-vitals` | Report de métricas | Sim |
| Cache | `/cache` | Flag / clear operacional | Sim |

## Admin

| Módulo | Rota | Descrição | Testes |
|---|---|---|---|
| Schema / roles | `/admin/schema`, `/admin/roles` | Meta para UI Admin | Sim |
| External services | `/admin/external-services` | Credenciais e enable | Sim |
| Storage | `/admin/storage` | Drivers local/S3/GCS | Sim |
| Sample data | `/admin/sample-data` | Limpeza de fixtures | Sim (GET; DELETE não coberto) |
| System errors | `/admin/system-errors` | Triagem de erros | Sim |
| Web vitals | `/admin/web-vitals` | Consulta agregada | Sim |
| Cache | `/admin/cache` | Admin do memory cache | Sim |
| Webhooks | `/admin/webhooks` | Endpoints outbound + outbox | Sim |

## Módulos externos (`/modules`)

| Módulo | Status | Descrição | Testes |
|---|---|---|---|
| Listagem / flags | ativo | Enable por módulo | Sim |
| pagarme | implementado | Checkout, webhooks, split | Parcial |
| soucannabis_orders | implementado | Sync e outbound de pedidos | Parcial |
| loggi | implementado | Cotação / etiqueta | Parcial (live) |
| melhorenvio | implementado | Cotação / OAuth / etiqueta | Parcial (live) |
| geoapify | implementado | Validação de endereço | Parcial |
| google_calendar | implementado | Eventos / OAuth | Parcial |
| utalk | implementado | WhatsApp / triagem | Parcial |
| ciap2 | implementado | Status / catálogo | Sim |
| email | stub / config | Envio SMTP | Parcial (templates) |
| beeviral, pipefy, brasilnfe, scp, nibo | stub | Placeholder quando enabled | Parcial (disabled list) |

## Serviços internos (amostra)

| Serviço | Descrição | Testes |
|---|---|---|---|
| `ordersService` / `orderTotals` / `orderStatusesService` | Pedidos e totais | Sim |
| `productsService` / `stockService` | Produtos e estoque | Sim |
| `servicesService` / `servicesReportsService` | Serviços e relatório | Sim / Parcial |
| `receptionService` | Triagem | Sim |
| `webhooks` (emit/worker/dispatch) | Outbound configurável + outbox | Sim |
| `usersService` / `registrationService` | Associados / funil | Sim |
| `systemUsersService` | Operadores | Sim |
| `itemsService` + parsers (filter/sort/fields) | CRUD genérico | Sim |
| `searchService` / `analyticsService` / `reportsService` | Busca e analytics | Sim |
| `docSign*` | Termos / PDF | Sim |
| `freight*` / `storeFreightConfig` | Frete | Sim |
| `pagarme/*` | PSP | Parcial |
| `soucannabis_orders/*` | Pedidos SC | Parcial |
| `geoapify/*` | Endereço | Parcial |
| `google_calendar/*` | Agenda | Parcial |
| `utalk/*` | WhatsApp | Parcial (`attendants`: Não) |
| `loggi/*` / `melhorenvio/*` | Frete carriers | Parcial |
| `email/*` | Templates SMTP | Parcial |
| `systemErrorsService` | Observabilidade | Sim |
| `webVitalsService` | Web Vitals | Sim |
| `institutionalClientsService` | Institucionais | Parcial |
| `credentialsService` | Secrets | Sim |
| `professionalTypesConfig` | Tipos profissional | Sim |
| `storageAdminService` / `cacheAdminService` | Admin infra | Sim (via rotas) |
| `sampleDataService` | Sample data | Parcial (GET) |
| `activityService` | Histórico | Sim |
| `ciap2Config` | CIAP-2 | Sim |
| `systemInviteService` / `professionalPortalAccess` | Convite / portal | Não |
| `linkGuards` / `recipientContact` / `orderAddressTracking` | Auxiliares pedido | Não |

## Storage

| Driver | Descrição | Testes |
|---|---|---|---|
| local | Disco local | API status: Sim · e2e apps: Parcial |
| s3 | AWS S3 / compatível | API status: Sim · e2e: Parcial |
| gcs | Google Cloud Storage | API status: Sim · e2e: Parcial |

## Cache

| Peça | Descrição | Testes |
|---|---|---|---|
| `memoryCache` | TTL em memória | Sim |
| Rotas admin/operacionais | Enable / clear | Sim |
