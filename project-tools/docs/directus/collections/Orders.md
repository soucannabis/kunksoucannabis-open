# Collection: `Orders`

- **Tabela física:** `Orders`
- **Schema SQL:** `public`
- **Singleton:** não
- **Hidden:** não
- **Nota:** —
- **Campos:** 60
- **Relações oficiais (outgoing):** 1
- **Relações oficiais (incoming):** 1
- **Vínculos lógicos:** 1

## Campos

| Campo | Tipo Directus | Tipo SQL | PK | Nullable | Unique | FK → | Interface | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | integer | integer | ✓ | não | ✓ | — | numeric | — |
| `sort` | integer | integer | — | sim | — | — | input | — |
| `date_created` | timestamp | timestamp with time zone | — | sim | — | — | datetime | — |
| `date_updated` | timestamp | timestamp with time zone | — | sim | — | — | datetime | — |
| `status` | string | character varying | — | sim | — | — | select-dropdown | — |
| `total` | float | real | — | sim | — | — | input | — |
| `payment_form` | string | character varying | — | sim | — | — | select-dropdown | — |
| `tracking_code` | string | character varying | — | sim | — | — | input | — |
| `delivery_price` | float | real | — | sim | — | — | input | — |
| `name_associate` | string | character varying | — | sim | — | — | input | — |
| `order_code` | uuid | uuid | — | sim | — | — | input | — |
| `user_code` | string | character varying | — | sim | — | — | input | — |
| `pipefy_card_shop` | string | character varying | — | sim | — | — | input | — |
| `items` | json | json | — | sim | — | — | input-code | — |
| `melhorenvio_order_id` | string | character varying | — | sim | — | — | input | — |
| `created_date` | dateTime | timestamp without time zone | — | sim | — | — | datetime | — |
| `discount` | float | real | — | sim | — | — | input | — |
| `details` | text | text | — | sim | — | — | input | — |
| `partner` | string | character varying | — | sim | — | — | input | — |
| `donation` | float | real | — | sim | — | — | input | — |
| `prescriber` | string | character varying | — | sim | — | — | input | — |
| `institution` | string | character varying | — | sim | — | — | input | — |
| `cancel_info` | string | character varying | — | sim | — | — | input | — |
| `carrier` | string | character varying | — | sim | — | — | input | — |
| `payment_link` | text | text | — | sim | — | — | input | — |
| `payment_account` | string | character varying | — | sim | — | — | input | — |
| `tracking_code_pb` | string | character varying | — | sim | — | — | input | — |
| `user` | integer | integer | — | sim | — | `Users.id` | select-dropdown-m2o | — |
| `code` | string | character varying | — | sim | — | — | input | — |
| `payment_code` | text | text | — | sim | — | — | input-multiline | — |
| `info` | text | text | — | sim | — | — | input-multiline | — |
| `documents` | alias | — | — | sim | — | — | files | — |
| `tags` | json | json | — | sim | — | — | input-code | — |
| `message_check` | string | character varying | — | sim | — | — | input | — |
| `delivery_text` | text | text | — | sim | — | — | input-multiline | — |
| `address` | json | json | — | sim | — | — | input-code | — |
| `msg_whatsapp` | string | character varying | — | sim | — | — | input | — |
| `bvid` | string | character varying | — | sim | — | — | input | — |
| `prescriber_code` | string | character varying | — | sim | — | — | input | — |
| `partner_code` | string | character varying | — | sim | — | — | input | — |
| `payment_date` | dateTime | timestamp without time zone | — | sim | — | — | datetime | — |
| `bvinfo` | json | json | — | sim | — | — | input-code | — |
| `created_pipefy` | dateTime | timestamp without time zone | — | sim | — | — | datetime | — |
| `at2` | string | character varying | — | sim | — | — | input | — |
| `at3` | string | character varying | — | sim | — | — | input | — |
| `custom_payment` | json | json | — | sim | — | — | input-code | — |
| `total_products` | float | real | — | sim | — | — | input | — |
| `validation` | string | character varying | — | sim | — | — | input | — |
| `in_production` | string | character varying | — | sim | — | — | input | — |
| `coupon_id` | string | character varying | — | sim | — | — | input | — |
| `tracking_code_date` | dateTime | timestamp without time zone | — | sim | — | — | datetime | — |
| `delivery_problem` | json | json | — | sim | — | — | input-code | — |
| `last_tracking_date` | dateTime | timestamp without time zone | — | sim | — | — | datetime | — |
| `survey_msg` | string | character varying | — | sim | — | — | input | — |
| `no_commission` | boolean | boolean | — | sim | — | — | boolean | — |
| `address_validation` | string | character varying | — | sim | — | — | input | — |
| `dce` | json | json | — | sim | — | — | input-code | — |
| `batch` | string | character varying | — | sim | — | — | input | — |
| `at` | string | character varying | — | sim | — | — | input | — |
| `kunk_user` | string | character varying | — | sim | — | — | input | — |

## Relações de saída (esta collection → outras)

| Campo | Relacionada | FK column | on_delete | Fonte |
|---|---|---|---|---|
| `user` | `Users` | `id` | SET NULL | directus_relations |

## Relações de entrada (outras → esta collection)

| Collection origem | Campo | FK column | on_delete | Fonte |
|---|---|---|---|---|
| `Orders_files` | `Orders_id` | `id` | SET NULL | directus_relations |

## Vínculos lógicos (sem FK no Directus)

| Campo | Alvo (collection.field) | Tipo campo | Nota |
|---|---|---|---|
| `user_code` | `Users.user_code` | character varying | Espelho do user_code do associado; FK real é Orders.user → Users.id. |
