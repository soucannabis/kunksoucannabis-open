# Cache operacional

Memory cache (Map + TTL) no `kunk-api` e no app Kunk, com flag Admin para ligar/desligar.

## Flag

| system | key | default |
|---|---|---|
| `cache` | `cache.enabled` | `false` |

Seed: [`../../sql/alter-system-configs-cache.sql`](../../sql/alter-system-configs-cache.sql).

Desligar (`enabled: false`) limpa imediatamente o `memoryCache` do servidor. O app Kunk detecta via `GET /cache/status` (no boot e no `focus` da janela) e limpa o cache do browser.

## Endpoints

Base: `/api/v1`

| Método | Path | Auth | Uso |
|---|---|---|---|
| GET | `/admin/cache` | Administrador | `{ enabled, size, keys }` |
| PATCH | `/admin/cache` | Administrador | `{ enabled: boolean }` — se false, limpa |
| POST | `/admin/cache/clear` | Administrador | Limpa sem mudar a flag |
| GET | `/cache/status` | Operador | `{ enabled }` |
| POST | `/cache/clear` | Operador | Limpa (clique no logo) |

## TTLs (servidor)

| Chave | TTL | Origem |
|---|---|---|
| `tags:*` | 10 min | `tagsService.listByContext` |
| `products:catalog:all` | 5 min | `productsService.listProducts` |
| `kunk-users:attendants` | 45 min | `receptionService.listAttendants` |
| `soucannabis_orders:products` | 5 min | proxy `listProducts` do módulo |
| `soucannabis_orders:tags` | 10 min | proxy `listTags` do módulo |

Invalidação pontual em mutações CRUD de tags/products/system_users; proxy SC só via clear/disable.

## Frontend (apps/kunk)

- `lib/cache/memoryCache.js` + fetchers com TTL (tags, produtos local/SC, atendentes, profissionais, serviços 14d, user-by-code)
- `CacheConfigProvider` — status + `clearAllCache`
- Clique no **logo** da sidebar → limpa FE + `POST /cache/clear` + reload (não apaga auth/tema no `localStorage`)

## Admin

Página `/cache` (também `/configs/cache`): toggle + “Limpar cache agora”.
