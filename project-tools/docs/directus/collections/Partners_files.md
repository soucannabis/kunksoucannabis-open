# Collection: `Partners_files`

- **Tabela física:** `Partners_files`
- **Schema SQL:** `public`
- **Singleton:** não
- **Hidden:** sim
- **Nota:** —
- **Campos:** 3
- **Relações oficiais (outgoing):** 0
- **Relações oficiais (incoming):** 0
- **Vínculos lógicos:** 2

## Campos

| Campo | Tipo Directus | Tipo SQL | PK | Nullable | Unique | FK → | Interface | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | integer | integer | ✓ | não | ✓ | — | numeric | — |
| `Partners_id` | integer | integer | — | sim | — | — | — | — |
| `directus_files_id` | uuid | uuid | — | sim | — | — | — | — |

## Relações de saída (esta collection → outras)

_Nenhuma relação oficial._

## Relações de entrada (outras → esta collection)

_Nenhuma relação oficial._

## Vínculos lógicos (sem FK no Directus)

| Campo | Alvo (collection.field) | Tipo campo | Nota |
|---|---|---|---|
| `Partners_id` | `Partners.id` | integer | Junction de arquivos sem meta/relation registrada no Directus. |
| `directus_files_id` | `directus_files.id` | uuid | Junction → arquivo Directus; relation não registrada. |
