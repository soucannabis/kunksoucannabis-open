# Collection: `Users_files`

- **Tabela física:** `Users_files`
- **Schema SQL:** `public`
- **Singleton:** não
- **Hidden:** sim
- **Nota:** —
- **Campos:** 3
- **Relações oficiais (outgoing):** 1
- **Relações oficiais (incoming):** 0
- **Vínculos lógicos:** 0

## Campos

| Campo | Tipo Directus | Tipo SQL | PK | Nullable | Unique | FK → | Interface | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | integer | integer | ✓ | não | ✓ | — | — | — |
| `Users_id` | integer | integer | — | sim | — | `Users.id` | — | — |
| `directus_files_id` | uuid | uuid | — | sim | — | `directus_files.id` | — | — |

## Relações de saída (esta collection → outras)

| Campo | Relacionada | FK column | on_delete | Fonte |
|---|---|---|---|---|
| `Users_id` | `Users` | `id` | SET NULL | directus_relations |

## Relações de entrada (outras → esta collection)

_Nenhuma relação oficial._

## Vínculos lógicos (sem FK no Directus)

_Nenhum heuristicamente detectado nesta collection._
