# Collection: `Users_Api`

- **Tabela física:** `Users_Api`
- **Schema SQL:** `public`
- **Singleton:** não
- **Hidden:** não
- **Nota:** —
- **Campos:** 3
- **Relações oficiais (outgoing):** 0
- **Relações oficiais (incoming):** 0
- **Vínculos lógicos:** 0

## Campos

| Campo | Tipo Directus | Tipo SQL | PK | Nullable | Unique | FK → | Interface | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | integer | integer | ✓ | não | ✓ | — | numeric | — |
| `email` | string | character varying | — | sim | — | — | input | — |
| `token` | string | character varying | — | sim | — | — | input | — |

## Relações de saída (esta collection → outras)

_Nenhuma relação oficial._

## Relações de entrada (outras → esta collection)

_Nenhuma relação oficial._

## Vínculos lógicos (sem FK no Directus)

_Nenhum heuristicamente detectado nesta collection._
