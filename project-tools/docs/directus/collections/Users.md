# Collection: `Users`

- **Tabela física:** `Users`
- **Schema SQL:** `public`
- **Singleton:** não
- **Hidden:** não
- **Nota:** —
- **Campos:** 67
- **Relações oficiais (outgoing):** 0
- **Relações oficiais (incoming):** 2
- **Vínculos lógicos:** 2

## Campos

| Campo | Tipo Directus | Tipo SQL | PK | Nullable | Unique | FK → | Interface | Nota |
|---|---|---|---|---|---|---|---|---|
| `id` | integer | integer | ✓ | não | ✓ | — | numeric | — |
| `status` | string | character varying | — | sim | — | — | select-dropdown | — |
| `sort` | integer | integer | — | sim | — | — | input | — |
| `date_created` | timestamp | timestamp with time zone | — | sim | — | — | datetime | — |
| `date_updated` | timestamp | timestamp with time zone | — | sim | — | — | datetime | — |
| `responsable_type` | string | character varying | — | sim | — | — | input | — |
| `associate_status` | integer | integer | — | sim | — | — | input | — |
| `name_associate` | string | character varying | — | sim | — | — | input | — |
| `lastname_associate` | string | character varying | — | sim | — | — | input | — |
| `cpf_associate` | string | character varying | — | sim | — | — | input | — |
| `rg_associate` | string | character varying | — | sim | — | — | input | — |
| `gender` | string | character varying | — | sim | — | — | input | — |
| `nationality` | string | character varying | — | sim | — | — | input | — |
| `emiiter_rg_associate` | string | character varying | — | sim | — | — | input | — |
| `marital_status` | string | character varying | — | sim | — | — | input | — |
| `mobile_number` | string | character varying | — | sim | — | — | input | — |
| `secundary_number` | string | character varying | — | sim | — | — | input | — |
| `street` | string | character varying | — | sim | — | — | input | — |
| `number` | string | character varying | — | sim | — | — | input | — |
| `complement` | string | character varying | — | sim | — | — | input | — |
| `neighborhood` | string | character varying | — | sim | — | — | input | — |
| `city` | string | character varying | — | sim | — | — | input | — |
| `state` | string | character varying | — | sim | — | — | input | — |
| `cep` | string | character varying | — | sim | — | — | input | — |
| `reason_treatment_text` | text | text | — | sim | — | — | input-multiline | — |
| `email_account` | string | character varying | — | sim | — | — | input | — |
| `pass_account` | string | character varying | — | sim | — | — | input | — |
| `user_code` | uuid | uuid | — | sim | — | — | input | — |
| `rg_proof` | string | character varying | — | sim | — | — | input | — |
| `proof_of_address` | string | character varying | — | sim | — | — | input | — |
| `rg_patient_proof` | string | character varying | — | sim | — | — | input | — |
| `medical_prescription` | string | character varying | — | sim | — | — | input | — |
| `responsable_code` | string | character varying | — | sim | — | — | input | — |
| `user_path` | string | character varying | — | sim | — | — | input | — |
| `reason_treatment` | text | text | — | sim | — | — | input | — |
| `pipefy_card_id` | string | character varying | — | sim | — | — | input | — |
| `birthday_associate` | string | character varying | — | sim | — | — | input | — |
| `responsible_for` | string | character varying | — | sim | — | — | input | — |
| `adhesion_term` | text | text | — | sim | — | — | input | — |
| `log` | text | text | — | sim | — | — | input | — |
| `products` | string | character varying | — | sim | — | — | input | — |
| `date_prescription` | date | date | — | sim | — | — | datetime | — |
| `anotations` | text | text | — | sim | — | — | input-multiline | — |
| `partner` | string | character varying | — | sim | — | — | input | — |
| `met_us` | string | character varying | — | sim | — | — | input | — |
| `handbook` | text | text | — | sim | — | — | input-multiline | — |
| `pipefy_card_shop` | string | character varying | — | sim | — | — | input | — |
| `created_date` | dateTime | timestamp without time zone | — | sim | — | — | datetime | — |
| `documents` | alias | — | — | sim | — | — | files | — |
| `avatar_url` | string | character varying | — | sim | — | — | input | — |
| `active_order` | json | json | — | sim | — | — | input-code | — |
| `active_service` | json | json | — | sim | — | — | input-code | — |
| `prescriber` | string | character varying | — | sim | — | — | input | — |
| `address_delivery` | json | json | — | sim | — | — | input-code | — |
| `at` | string | character varying | — | sim | — | — | input | — |
| `prescriber_code` | string | character varying | — | sim | — | — | input | — |
| `partner_code` | string | character varying | — | sim | — | — | input | — |
| `bvid` | string | character varying | — | sim | — | — | input | — |
| `bv_info` | json | json | — | sim | — | — | input-code | — |
| `session_token` | string | character varying | — | sim | — | — | input | — |
| `session_expires` | dateTime | timestamp without time zone | — | sim | — | — | datetime | — |
| `last_activity` | dateTime | timestamp without time zone | — | sim | — | — | datetime | — |
| `is_session_active` | boolean | boolean | — | sim | — | — | boolean | — |
| `gdrive_link` | string | character varying | — | sim | — | — | input | — |
| `bkp` | string | character varying | — | sim | — | — | input | — |
| `fullname` | string | character varying | — | sim | — | — | input | — |

## Relações de saída (esta collection → outras)

_Nenhuma relação oficial._

## Relações de entrada (outras → esta collection)

| Collection origem | Campo | FK column | on_delete | Fonte |
|---|---|---|---|---|
| `Orders` | `user` | `id` | SET NULL | directus_relations |
| `Users_files` | `Users_id` | `id` | SET NULL | directus_relations |

## Vínculos lógicos (sem FK no Directus)

| Campo | Alvo (collection.field) | Tipo campo | Nota |
|---|---|---|---|
| `partner_code` | `Partners.user_code` | character varying | Código do parceiro; nome fica em partner_name. |
| `responsible_for` | `Users.user_code` | character varying | user_code do paciente (registro do responsável); no schema alvo vira patient_user_code. |
