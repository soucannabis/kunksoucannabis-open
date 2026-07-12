# Collection: `Kunk_Users`

- **Tabela física:** `Kunk_Users`
- **Schema SQL:** `public`
- **Singleton:** não
- **Hidden:** não
- **Nota:** —
- **Campos:** 42
- **Relações oficiais (outgoing):** 0
- **Relações oficiais (incoming):** 0
- **Vínculos lógicos:** 1

## Campos

| Campo | Tipo Directus | Tipo SQL | PK | Nullable | Unique | FK → | Interface | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | integer | integer | ✓ | não | ✓ | — | numeric | — |
| `date_created` | timestamp | timestamp with time zone | — | sim | — | — | datetime | — |
| `date_updated` | timestamp | timestamp with time zone | — | sim | — | — | datetime | — |
| `name` | string | character varying | — | sim | — | — | input | — |
| `last_name` | string | character varying | — | sim | — | — | input | — |
| `status` | string | character varying | — | sim | — | — | input | — |
| `user_code` | uuid | uuid | — | sim | — | — | input | — |
| `permissions` | string | character varying | — | sim | — | — | input | — |
| `email` | string | character varying | — | sim | — | — | input | — |
| `pass` | string | character varying | — | sim | — | — | input | — |
| `cpf` | string | character varying | — | sim | — | — | input | — |
| `rg` | string | character varying | — | sim | — | — | input | — |
| `rg_emitter` | string | character varying | — | sim | — | — | input | — |
| `birthday` | string | character varying | — | sim | — | — | input | — |
| `gender` | string | character varying | — | sim | — | — | input | — |
| `nationality` | string | character varying | — | sim | — | — | input | — |
| `marital_status` | string | character varying | — | sim | — | — | input | — |
| `mobile_number` | string | character varying | — | sim | — | — | input | — |
| `street` | string | character varying | — | sim | — | — | input | — |
| `number_street` | string | character varying | — | sim | — | — | input | — |
| `neighborhood` | string | character varying | — | sim | — | — | input | — |
| `city` | string | character varying | — | sim | — | — | input | — |
| `state` | string | character varying | — | sim | — | — | input | — |
| `cep` | string | character varying | — | sim | — | — | input | — |
| `pix_key` | string | character varying | — | sim | — | — | input | — |
| `type` | string | character varying | — | sim | — | — | input | — |
| `council` | string | character varying | — | sim | — | — | input | — |
| `n_council` | string | character varying | — | sim | — | — | input | — |
| `associates` | string | character varying | — | sim | — | — | input | — |
| `commission_value` | string | character varying | — | sim | — | — | input | — |
| `commission_total` | string | character varying | — | sim | — | — | input | — |
| `transactions` | string | character varying | — | sim | — | — | input | — |
| `partner_link` | string | character varying | — | sim | — | — | input | — |
| `pipefy_id` | string | character varying | — | sim | — | — | input | — |
| `avatar_url` | string | character varying | — | sim | — | — | input | — |
| `utalk_id` | string | character varying | — | sim | — | — | input | — |
| `utalk_token` | text | text | — | sim | — | — | input-multiline | — |
| `session_token` | string | character varying | — | sim | — | — | input | — |
| `session_expires` | dateTime | timestamp without time zone | — | sim | — | — | datetime | — |
| `last_activity` | dateTime | timestamp without time zone | — | sim | — | — | datetime | — |
| `is_session_active` | boolean | boolean | — | sim | — | — | boolean | — |
| `internal_code` | string | character varying | — | sim | — | — | input | — |

## Relações de saída (esta collection → outras)

_Nenhuma relação oficial._

## Relações de entrada (outras → esta collection)

_Nenhuma relação oficial._

## Vínculos lógicos (sem FK no Directus)

| Campo | Alvo (collection.field) | Tipo campo | Nota |
|---|---|---|---|
| `associates` | `Users.user_code` | character varying | Lista/texto de associados vinculados ao usuário interno. |
