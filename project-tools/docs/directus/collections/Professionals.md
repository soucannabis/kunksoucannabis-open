# Collection: `Professionals`

- **Tabela física:** `Professionals`
- **Schema SQL:** `public`
- **Singleton:** não
- **Hidden:** não
- **Nota:** —
- **Campos:** 28
- **Relações oficiais (outgoing):** 0
- **Relações oficiais (incoming):** 0
- **Vínculos lógicos:** 0

## Campos

| Campo | Tipo Directus | Tipo SQL | PK | Nullable | Unique | FK → | Interface | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | integer | integer | ✓ | não | ✓ | — | numeric | — |
| `sort` | integer | integer | — | sim | — | — | input | — |
| `date_created` | timestamp | timestamp with time zone | — | sim | — | — | datetime | — |
| `name` | string | character varying | — | sim | — | — | input | — |
| `lastname` | string | character varying | — | sim | — | — | input | — |
| `email` | string | character varying | — | sim | — | — | input | — |
| `cpf` | string | character varying | — | sim | — | — | input | — |
| `phone` | string | character varying | — | sim | — | — | input | — |
| `city` | string | character varying | — | sim | — | — | input | — |
| `state` | string | character varying | — | sim | — | — | input | — |
| `type` | string | character varying | — | sim | — | — | input | — |
| `services` | string | character varying | — | sim | — | — | input | — |
| `specialty` | string | character varying | — | sim | — | — | input | — |
| `active` | integer | integer | — | sim | — | — | input | — |
| `is_prescriber` | string | character varying | — | sim | — | — | input | — |
| `is_collaborator` | string | character varying | — | sim | — | — | input | — |
| `professional_code` | uuid | uuid | — | sim | — | — | input | — |
| `fingerprint` | string | character varying | — | sim | — | — | input | — |
| `info_report` | json | json | — | sim | — | — | input-code | — |
| `bvid` | string | character varying | — | sim | — | — | input | — |
| `finder_name` | string | character varying | — | sim | — | — | input | — |
| `beeviral_app_url` | string | character varying | — | sim | — | — | input | — |
| `met_us` | string | character varying | — | sim | — | — | input | — |
| `recipient_id` | string | character varying | — | sim | — | — | input | — |
| `at` | string | character varying | — | sim | — | — | input | — |
| `donation_balance` | integer | integer | — | sim | — | — | input | — |
| `app_user` | string | character varying | — | sim | — | — | input | — |
| `calendar_id` | string | character varying | — | sim | — | — | input | — |

## Relações de saída (esta collection → outras)

_Nenhuma relação oficial._

## Relações de entrada (outras → esta collection)

_Nenhuma relação oficial._

## Vínculos lógicos (sem FK no Directus)

_Nenhum heuristicamente detectado nesta collection._
