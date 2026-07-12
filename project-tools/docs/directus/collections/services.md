# Collection: `services`

- **Tabela física:** `services`
- **Schema SQL:** `public`
- **Singleton:** não
- **Hidden:** não
- **Nota:** —
- **Campos:** 40
- **Relações oficiais (outgoing):** 0
- **Relações oficiais (incoming):** 1
- **Vínculos lógicos:** 1

## Campos

| Campo | Tipo Directus | Tipo SQL | PK | Nullable | Unique | FK → | Interface | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | integer | integer | ✓ | não | ✓ | — | numeric | — |
| `sort` | integer | integer | — | sim | — | — | input | — |
| `date_created` | timestamp | timestamp with time zone | — | sim | — | — | datetime | — |
| `type` | string | character varying | — | sim | — | — | input | — |
| `name` | string | character varying | — | sim | — | — | input | — |
| `professional` | string | character varying | — | sim | — | — | input | — |
| `professional_name` | string | character varying | — | sim | — | — | input | — |
| `status` | string | character varying | — | sim | — | — | input | — |
| `price` | integer | integer | — | sim | — | — | input | — |
| `associate` | string | character varying | — | sim | — | — | input | — |
| `associate_name` | string | character varying | — | sim | — | — | input | — |
| `associate_email` | string | character varying | — | sim | — | — | input | — |
| `event_link` | string | character varying | — | sim | — | — | input | — |
| `date` | dateTime | timestamp without time zone | — | sim | — | — | datetime | — |
| `pipefy_card_id` | string | character varying | — | sim | — | — | input | — |
| `payment_link` | string | character varying | — | sim | — | — | input | — |
| `event_id` | string | character varying | — | sim | — | — | input | — |
| `price_paid` | float | real | — | sim | — | — | input | — |
| `info` | text | text | — | sim | — | — | input | — |
| `donate` | float | real | — | sim | — | — | input | — |
| `message` | text | text | — | sim | — | — | input | — |
| `code` | string | character varying | — | sim | — | — | input | — |
| `at` | string | character varying | — | sim | — | — | input | — |
| `professional_paid` | float | real | — | sim | — | — | input | — |
| `patient_name` | string | character varying | — | sim | — | — | input | — |
| `professional_email` | string | character varying | — | sim | — | — | input | — |
| `service_code` | uuid | uuid | — | sim | — | — | input | — |
| `observations` | text | text | — | sim | — | — | input | — |
| `payment_type` | string | character varying | — | sim | — | — | input | — |
| `tags` | json | json | — | sim | — | — | input-code | — |
| `documents` | alias | — | — | sim | — | — | files | — |
| `kunk_user` | string | character varying | — | sim | — | — | input | — |
| `payment_code` | text | text | — | sim | — | — | input-multiline | — |
| `bvid` | string | character varying | — | sim | — | — | input | — |
| `fingerprint` | string | character varying | — | sim | — | — | input | — |
| `at3` | string | character varying | — | sim | — | — | input | — |
| `validation` | string | character varying | — | sim | — | — | input | — |
| `payment_info` | json | json | — | sim | — | — | input-code | — |
| `coupon_id` | string | character varying | — | sim | — | — | input | — |
| `survey_msg` | string | character varying | — | sim | — | — | input | — |

## Relações de saída (esta collection → outras)

_Nenhuma relação oficial._

## Relações de entrada (outras → esta collection)

| Collection origem | Campo | FK column | on_delete | Fonte |
|---|---|---|---|---|
| `services_files` | `services_id` | `id` | SET NULL | directus_relations |

## Vínculos lógicos (sem FK no Directus)

| Campo | Alvo (collection.field) | Tipo campo | Nota |
|---|---|---|---|
| `associate` | `Users.user_code` | character varying | Código/identificador do associado, sem FK. |
