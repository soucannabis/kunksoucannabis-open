# Collection: `Products`

- **Tabela física:** `Products`
- **Schema SQL:** `public`
- **Singleton:** não
- **Hidden:** não
- **Nota:** —
- **Campos:** 17
- **Relações oficiais (outgoing):** 0
- **Relações oficiais (incoming):** 0
- **Vínculos lógicos:** 0

## Campos

| Campo | Tipo Directus | Tipo SQL | PK | Nullable | Unique | FK → | Interface | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | integer | integer | ✓ | não | ✓ | — | numeric | — |
| `batch` | string | character varying | — | sim | — | — | input | — |
| `amount` | integer | integer | — | sim | — | — | input | — |
| `category` | string | character varying | — | sim | — | — | select-dropdown | — |
| `cod` | string | character varying | — | sim | — | — | input | — |
| `concentration` | integer | integer | — | sim | — | — | input | — |
| `date_created` | timestamp | timestamp with time zone | — | sim | — | — | datetime | — |
| `date_updated` | timestamp | timestamp with time zone | — | sim | — | — | datetime | — |
| `name` | string | character varying | — | sim | — | — | input | — |
| `photo` | uuid | uuid | — | sim | — | — | file-image | — |
| `price` | float | real | — | sim | — | — | input | — |
| `sort` | integer | integer | — | sim | — | — | input | — |
| `status` | string | character varying | — | não | — | — | select-dropdown | — |
| `type` | string | character varying | — | sim | — | — | input | — |
| `unity` | string | character varying | — | sim | — | — | input | — |
| `user_created` | uuid | uuid | — | sim | — | — | select-dropdown-m2o | — |
| `user_updated` | uuid | uuid | — | sim | — | — | select-dropdown-m2o | — |

## Relações de saída (esta collection → outras)

_Nenhuma relação oficial._

## Relações de entrada (outras → esta collection)

_Nenhuma relação oficial._

## Vínculos lógicos (sem FK no Directus)

_Nenhum heuristicamente detectado nesta collection._
