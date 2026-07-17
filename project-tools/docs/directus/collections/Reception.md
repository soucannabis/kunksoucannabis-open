# Collection: `Reception`

- **Tabela física:** `Reception`
- **Schema SQL:** `public`
- **Singleton:** não
- **Hidden:** não
- **Nota:** —
- **Campos:** 25
- **Relações oficiais (outgoing):** 0
- **Relações oficiais (incoming):** 0
- **Vínculos lógicos:** 1

## Campos

| Campo | Tipo Directus | Tipo SQL | PK | Nullable | Unique | FK → | Interface | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | integer | integer | ✓ | não | ✓ | — | numeric | — |
| `date_created` | timestamp | timestamp with time zone | — | sim | — | — | datetime | — |
| `name` | string | character varying | — | sim | — | — | input | — |
| `lastname` | string | character varying | — | sim | — | — | input | — |
| `email` | string | character varying | — | sim | — | — | input | — |
| `phone` | string | character varying | — | sim | — | — | input | — |
| `help_topic` | string | character varying | — | sim | — | — | input | — |
| `isAssociate` | string | character varying | — | sim | — | — | input | — |
| `message` | text | text | — | sim | — | — | input | — |
| `code` | uuid | uuid | — | sim | — | — | input | — |
| `chatId` | string | character varying | — | sim | — | — | input | — |
| `status` | string | character varying | — | sim | — | — | input | — |
| `associate_name` | string | character varying | — | sim | — | — | input | — |
| `associate_code` | string | character varying | — | sim | — | — | input | — |
| `date_updated` | dateTime | timestamp without time zone | — | sim | — | — | datetime | — |
| `avatar_url` | string | character varying | — | sim | — | — | input | — |
| `patient_name` | string | character varying | — | sim | — | — | input | — |
| `attendant` | string | character varying | — | sim | — | — | input | — |
| `tags` | json | json | — | sim | — | — | input-code | — |
| `action` | string | character varying | — | sim | — | — | input | — |
| `bvid` | string | character varying | — | sim | — | — | input | — |
| `is_prescriber` | string | character varying | — | sim | — | — | input | — |
| `at` | string | character varying | — | sim | — | — | input | — |
| `fullname` | string | character varying | — | sim | — | — | input | — |

## Relações de saída (esta collection → outras)

_Nenhuma relação oficial._

## Relações de entrada (outras → esta collection)

_Nenhuma relação oficial._

## Vínculos lógicos (sem FK no Directus)

| Campo | Alvo (collection.field) | Tipo campo | Nota |
|---|---|---|---|
| `associate_code` | `Users.user_code` | character varying | Código do associado no atendimento, sem FK. |
