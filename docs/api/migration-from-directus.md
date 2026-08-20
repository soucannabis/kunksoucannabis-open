# Migração Directus / kunkserver → Kunk API v1

Guia para adaptar clientes (painel, cadastramento, scripts) da API atual para a nova.

## Autenticação

| Antes | Depois |
|---|---|
| `POST /api/auth/login` | `POST /api/v1/auth/login` |
| Cookie `session_token` | Mantido (mesmo nome) |
| `API_TOKEN` fixo no env + `Users_Api` | `Authorization: Bearer` + `/auth/tokens` |
| Middleware Directus token | Removido |

## Items / Directus

| Antes | Depois |
|---|---|
| `GET {DIRECTUS}/items/Orders?...` | `GET /api/v1/items/orders?...` |
| `GET /api/directus/orders` | Preferir `/items/orders` ou `/orders` (domínio) |
| Collection `Users` | `users` |
| Collection `Kunk_Users` | `system_users` |
| Collection `Orders` | `orders` |
| `Coupons` | **Removido** do OSS |

## Renomes de campos (amostra)

Usar [field-rename-map.json](../directus/field-rename-map.json) como fonte completa.

| Antes (Directus) | Depois (API/DB) |
|---|---|
| `Orders.info` | `order_notes` |
| `Orders.code` | `carrier_order_code` |
| `Orders.partner` | removido (junto com integrações Pipefy/Beeviral) |
| `Orders.payment_form` | `payment_method` |
| `Orders.kunk_user` | `created_by_user_code` |
| `Orders.in_production` | `production_owner` |
| `Orders.validation` | removido |
| `Users.name_associate` | `associate_name` |
| `Users.responsible_for` | `patient_user_code` |
| `Users.anotations` | `annotations` |
| `Users.pass_account` | `account_password` |
| `services.donate` | `donation` |
| `services.code` | `booking_group_code` |
| `services.professional` | `professional_id` |
| `Products.cod` | `sku` |
| `Products.unity` | `unit` |
| `Tags.session` | `contexts` |
| `Partners.is_collaborator` | `is_favorite` |

## Rotas kunkserver frequentes

| Antes | Depois (proposta) |
|---|---|
| `/api/directus/users` | `/items/users` ou `/users` |
| `/api/directus/orders` | `/items/orders` ou `/orders` |
| `/api/directus/services` | `/items/services` ou `/services` |
| `/api/directus/search` | `/search` |
| `/api/directus/documents` | `/files` + attach |
| `/api/directus/kunk-user` | `/items/system_users` ou `/system-users` |
| `/api/pagarme/*` | `/modules/pagarme/*` |
| `/api/loggi/*` | `/modules/loggi/*` |
| `/api/googleCalendar/*` | `/modules/google_calendar/*` |

## Envelope de resposta

| Antes | Depois |
|---|---|
| Directus `{ data: … }` | `{ data, meta, errors }` |
| Arrays Directus em `data` | Mantido em `data` |
| Erros axios/Directus variados | Códigos em [errors.md](./errors.md) |

## Estratégia de migração do frontend

1. Introduzir client HTTP único (`apiClient`) apontando para `/api/v1`
2. Feature flag `USE_NEW_API`
3. Migrar collection a collection (tags → products → users → orders…)
4. Manter kunkserver `/api/directus` até paridade
5. Remover Directus e proxy

## Checklist de paridade

- [ ] Login / logout / me
- [ ] CRUD users + search
- [ ] CRUD orders + status/production
- [ ] Services + reception
- [ ] Files upload/download
- [ ] Partners / professionals
- [ ] Reports (sem SQL arbitrário inseguro)
- [ ] Módulos críticos da instalação
- [ ] Permissões por role equivalentes
