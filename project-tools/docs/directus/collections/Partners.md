# Collection: `Partners`

- **Tabela física:** `Partners`
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
| `status` | string | character varying | — | não | — | — | select-dropdown | — |
| `sort` | integer | integer | — | sim | — | — | input | — |
| `date_created` | timestamp | timestamp with time zone | — | sim | — | — | datetime | — |
| `date_updated` | timestamp | timestamp with time zone | — | sim | — | — | datetime | — |
| `first_name` | string | character varying | — | sim | — | — | input | — |
| `last_name` | string | character varying | — | sim | — | — | input | — |
| `cpf` | string | character varying | — | sim | — | — | input | — |
| `email` | string | character varying | — | sim | — | — | input | — |
| `pass_account` | string | character varying | — | sim | — | — | input | — |
| `mobile_number` | string | character varying | — | sim | — | — | input | — |
| `user_code` | uuid | uuid | — | sim | — | — | input | — |
| `user_path` | string | character varying | — | sim | — | — | input | — |
| `associates` | string | character varying | — | sim | — | — | input | — |
| `commission_value` | integer | integer | — | sim | — | — | input | — |
| `commission_total` | float | real | — | sim | — | — | input | — |
| `type` | string | character varying | — | sim | — | — | input | — |
| `pix_key` | string | character varying | — | sim | — | — | input | — |
| `transactions` | text | text | — | sim | — | — | input-multiline | — |
| `beeviral_id` | string | character varying | — | sim | — | — | input | — |
| `is_collaborator` | string | character varying | — | sim | — | — | input | — |
| `partners_finders` | json | json | — | sim | — | — | input-code | — |
| `info_report` | json | json | — | sim | — | — | input-code | — |
| `code_finder` | string | character varying | — | sim | — | — | input | — |
| `finder_name` | string | character varying | — | sim | — | — | input | — |

## Relações de saída (esta collection → outras)

_Nenhuma relação oficial._

## Relações de entrada (outras → esta collection)

_Nenhuma relação oficial._

## Vínculos lógicos (sem FK no Directus)

| Campo | Alvo (collection.field) | Tipo campo | Nota |
|---|---|---|---|
| `associates` | `Users.user_code` | character varying | Lista/texto de associados do parceiro. |
