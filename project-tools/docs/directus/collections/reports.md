# Collection: `reports`

- **Tabela física:** `reports`
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
| `id` | integer | integer | ✓ | não | ✓ | — | input | — |
| `date_created` | timestamp | timestamp with time zone | — | sim | — | — | datetime | — |
| `date_updated` | timestamp | timestamp with time zone | — | sim | — | — | datetime | — |
| `name` | string | character varying | — | sim | — | — | input | — |
| `report_code` | uuid | uuid | — | sim | — | — | input | — |
| `obj_query` | json | json | — | sim | — | — | input-code | — |
| `sql_query` | text | text | — | sim | — | — | input | — |
| `type` | string | character varying | — | sim | — | — | input | — |
| `queries` | json | json | — | sim | — | — | input-code | — |
| `positions` | json | json | — | sim | — | — | input-code | — |
| `chart_obj` | json | json | — | sim | — | — | input-code | — |
| `created_by` | string | character varying | — | sim | — | — | input | — |
| `tags` | json | json | — | sim | — | — | input-code | — |
| `field_maps` | json | json | — | sim | — | — | input-code | — |
| `reports` | json | json | — | sim | — | — | input-code | — |
| `favorites` | json | json | — | sim | — | — | input-code | — |
| `details_query` | string | character varying | — | sim | — | — | input | — |

## Relações de saída (esta collection → outras)

_Nenhuma relação oficial._

## Relações de entrada (outras → esta collection)

_Nenhuma relação oficial._

## Vínculos lógicos (sem FK no Directus)

_Nenhum heuristicamente detectado nesta collection._
