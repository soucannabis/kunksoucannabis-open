# Campos com inglês incorreto ou inconsistente

> Inventário dos nomes de campos (e pontos de atenção em collections) do escopo Directus
> que apresentam **erro de ortografia em inglês**, **palavra errada**, **ordem invertida**
> ou **inconsistência grave de nomenclatura**.
>
> Fonte: `exports/directus/schema.json` (collections no escopo open source).
> Objetivo: base para renomeação no novo PostgreSQL (ver [MANIFESTO.md](../../../MANIFESTO.md) §3.1.1).
>
> Para análise de **sentido real do campo** (não só inglês), ver
> [field-naming-analysis.md](./field-naming-analysis.md).

Este arquivo **não** lista abreviações de domínio brasileiro aceitas (`cpf`, `rg`, `cep`, `pix`),
nem siglas de integrações (`bvid`, `bvinfo`, `dce`, pipefy/beeviral), salvo quando o inglês
do restante do nome está errado.

---

## Resumo

| Severidade | Qtd. |
|---|---:|
| Ortografia errada (typo) | 4 |
| Palavra inglesa incorreta / sentido errado | 8 |
| Ordem ou forma pouco idiomática | 6 |
| Inconsistência de casing / padrão | 7 |
| Abreviação ambígua a renomear | 9 |

---

## 1. Ortografia errada (typos)

| Collection | Campo atual | Sugestão | Problema |
|---|---|---|---|
| `Users` | `emiiter_rg_associate` | `emitter_rg_associate` ou `rg_issuer_associate` | Typo: **emiiter** → **emitter** (órgão emissor). |
| `Users` | `secundary_number` | `secondary_number` | Typo: **secundary** → **secondary**. |
| `Users` | `anotations` | `annotations` | Typo: **anotations** → **annotations**. |
| `Users` | `responsable_type` | `responsible_type` | Typo/francês: **responsable** → **responsible**. |
| `Users` | `responsable_code` | `responsible_code` | Idem. |

---

## 2. Palavra inglesa incorreta ou sentido errado

| Collection | Campo atual | Sugestão | Problema |
|---|---|---|---|
| `Products` | `unity` | `unit` | **Unity** ≠ unidade de medida; o correto é **unit**. |
| `Users` / `Partners` / `Kunk_Users` | `pass_account` / `pass` | `account_password` / `password` | **Pass** não é a forma usual de “senha”; usar **password**. |
| `Users` / `Kunk_Users` / `Professionals` (contexto data) | `birthday_associate` / `birthday` | `birth_date_associate` / `birth_date` | **Birthday** = aniversário; para data de nascimento o usual é **birth_date** / **date_of_birth**. |
| `services` | `donate` | `donation` | Campo numérico de valor; **donate** é verbo; alinhar a `donation` (já usado em `Orders`). |
| `Orders` | `payment_form` | `payment_method` | Em inglês de domínio, o habitual é **payment method**, não “form”. |
| `Coupons` | `created_in` | `created_at` ou `origin` | **created_in** é ambíguo (data? origem? app?). Precisa decisão de negócio na renomeação. |
| `Partners` | `partners_finders` | `finders` ou `partner_finders` | Plural + papel pouco idiomático; revisar significado (indicadores). |
| `Kunk_Users` | `n_council` | `council_number` | **n_** como “número” é abreviação frágil; preferir nome completo. |

---

## 3. Ordem das palavras pouco idiomática

Em inglês, o qualificativo costuma vir antes do núcleo (`user_name`, `street_number`).

| Collection | Campo atual | Sugestão | Problema |
|---|---|---|---|
| `Coupons` | `name_user` | `user_name` | Ordem invertida (PT → EN). |
| `Kunk_Users` | `number_street` | `street_number` | Ordem invertida. |
| `Users` | `name_associate` | `associate_name` | Ordem invertida (já existe `associate_name` em `Reception` / `services`). |
| `Users` | `lastname_associate` | `associate_last_name` | Ordem invertida + falta underscore em “last name”. |
| `Users` | `cpf_associate` | `associate_cpf` | Ordem invertida (padrão a unificar). |
| `Users` | `rg_associate` | `associate_rg` | Idem. |

> Nota: há um padrão misto hoje (`name_associate` em `Users`/`Orders` vs `associate_name` em `Reception`/`services`). Na migração, escolher **um** padrão (recomendado: `associate_*`).

---

## 4. Inconsistência de casing e composição

O banco usa majoritariamente `snake_case`. Estes campos quebram o padrão ou misturam estilos.

| Collection | Campo atual | Sugestão | Problema |
|---|---|---|---|
| `Reception` | `isAssociate` | `is_associate` | camelCase. |
| `Reception` | `chatId` | `chat_id` | camelCase. |
| `Reception` | `fullname` | `full_name` | Sem underscore; alinhar a snake_case. |
| `Professionals` / `Reception` | `lastname` | `last_name` | Falta underscore (`Kunk_Users` e `Partners` já usam `last_name`). |
| `Users` | `lastname_associate` | `associate_last_name` | Compõe “lastname” sem underscore. |
| `reports` | `obj_query` | `query_object` | Abreviação **obj** + ordem invertida. |
| `reports` | `chart_obj` | `chart_object` | Idem. |

---

## 5. Abreviações ambíguas (inglês “cortado”)

Não são typos literais, mas nomes ruins para um schema open source estável.

| Collection | Campo atual | Sugestão | Problema |
|---|---|---|---|
| `Coupons` / `Products` | `cod` | `code` | Abreviação desnecessária; outras tabelas usam `code` / `*_code`. |
| `Orders` / `services` / `Reception` | `msg_whatsapp` / `survey_msg` | `whatsapp_message` / `survey_message` | **msg** → **message**. |
| `Orders` / `Users` / `services` / `Professionals` / `Reception` | `at`, `at2`, `at3` | definir nomes semânticos (ex.: `attendant`, `attendant_2`) | Sigla opaca (provável “atendente”); não é inglês legível. |
| `Orders` | `info` | `notes` ou `details` | Já existe `details`; **info** é genérico demais. |
| `services` | `info` | `notes` ou `details` | Idem. |
| `Partners` | `pass_account` | `account_password` | Ver §2. |
| `Users` | `log` | `activity_log` ou `history` | **log** genérico demais. |
| `Users` | `bkp` | `backup` ou `backup_ref` | Abreviação PT/informal. |
| `Tags` | `session` | revisar significado (`context`, `scope`, `entity`) | Em inglês, **session** sugere sessão de usuário; pode estar semanticamente errado. |

---

## 6. Collections / tabelas com nomenclatura a padronizar

Não são campos, mas entram no mesmo esforço de correção de nomes (§1.1 do manifesto):

| Nome atual | Sugestão | Nota |
|---|---|---|
| `Kunk_Users` | `kunk_users` | Pascal + underscore; padronizar snake_case. |
| `Users_Api` | `users_api` | Idem. |
| `Orders_files` / `Partners_files` / `Users_files` / `services_files` | `orders_files`, etc. | Mistura Pascal/snake; junctions devem seguir o mesmo padrão. |
| `reports` / `services` | manter minúsculo **ou** capitalizar todas | Hoje há mix `Orders` vs `services` vs `reports`. |

---

## 7. Prioridade sugerida para a migração

1. **Alto** — typos e palavra errada (§1 e §2): impactam legibilidade e buscas no código.
2. **Médio** — ordem `*_associate` vs `associate_*` e `lastname` vs `last_name` (§3 e §4): exige mapa de rename consistente.
3. **Baixo** — abreviações (`cod`, `msg`, `at*`, `obj`) e casing de collections (§5 e §6): fazer junto do schema final.

---

## Como atualizar este inventário

Após novas alterações no Directus ou no filtro de collections:

```bash
cd project-tools && npm run directus:extract
```

Depois, revisar os campos das collections em `docs/directus/collections/` e ajustar este arquivo se novos nomes incorretos aparecerem.
