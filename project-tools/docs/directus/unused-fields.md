# Campos nunca usados no sistema (análise estática)

> Cruzamento do schema Directus (escopo OSS) com o código em `src/`, `kunkserver/` e `cadastramento/`.
> Gerado por `npm run fields:unused` → `exports/directus/unused-fields-analysis.json`.

## Metodologia

| Classificação | Critério |
|---|---|
| **unused** | Nenhuma referência ao nome do campo no código da aplicação |
| **metadata_only** | Aparece só em `FieldSelector.jsx` (lista de campos ocultos / labels de relatório) |
| **weak** | 1 referência marginal (ex.: só em log ou componente genérico) |
| **used** | Leitura/escrita em fluxo de negócio |

**Limitações:** não detecta uso manual no Directus, scripts externos, automações Pipefy ou dados populados só no banco. Campos `alias` (`documents`) são virtuais do Directus.

---

## Resumo

| Classificação | Qtd. |
|---|---:|
| Nunca usados (`unused`) | **41** |
| Só metadado de relatório (`metadata_only`) | **10** |
| Uso fraco (`weak`) | **9** |
| Usados | 299 |
| Alias Directus | 3 |

---

## 1. Nunca usados — candidatos a remoção na migração

### Coupons (2)
| Campo | Nota |
|---|---|
| `created_in` | Não está no POST/PATCH do backend de cupons |
| `app_user` | Sem referência |

### Kunk_Users (8)
| Campo | Nota |
|---|---|
| `rg_emitter` | Formulário de system user não expõe |
| `number_street` | Sem referência |
| `council` | Sem referência |
| `n_council` | Sem referência |
| `associates` | Sem CRUD no OSS |
| `partner_link` | Sem referência |
| `pipefy_id` | Sem referência |
| `type` | Sem referência |

### Orders (7)
| Campo | Nota |
|---|---|
| `at` | Só label em FieldSelector; sem read/write |
| `at2` | Sem referência |
| `at3` | Sem referência |
| `created_pipefy` | Sem referência |
| `total_products` | Sem referência |
| `survey_msg` | Sem referência |
| `batch` | Lote real está em `items[].batch`; campo no pedido é legado |

### Partners (4)
| Campo | Nota |
|---|---|
| `associates` | Sem CRUD |
| `partners_finders` | Sem referência |
| `code_finder` | Sem referência |
| `finder_name` | Sem referência |

### Partners_files (1)
| Campo | Nota |
|---|---|
| `Partners_id` | Junction sem upload em `documents.js` (só Users/Orders/services) |

### Products (1)
| Campo | Nota |
|---|---|
| `amount` | Não está em `PRODUCT_FIELDS`; não aparece na UI de produtos |

### Professionals (4)
| Campo | Nota |
|---|---|
| `at` | Sem referência |
| `finder_name` | Sem referência |
| `beeviral_app_url` | Sem referência |
| `app_user` | Sem referência |

### reports (1)
| Campo | Nota |
|---|---|
| `details_query` | Sem referência no código |

### services (6)
| Campo | Nota |
|---|---|
| `at` | Sem referência |
| `at3` | Sem referência |
| `info` | Sem read/write |
| `message` | Sem read/write |
| `survey_msg` | Sem referência |
| `payment_info` | Código grava `payment_link` / `payment_code`, não este campo |

### Users (4)
| Campo | Nota |
|---|---|
| `at` | Sem referência |
| `met_us` | Usado em Professionals/cart; **não** em Users |
| `gdrive_link` | Sem referência |
| `bkp` | Sem referência |

---

## 2. Só metadado (FieldSelector) — não usados em fluxo normal

Aparecem como campo oculto ou label para relatórios dinâmicos; **não** há leitura/escrita no app.

### Orders (6)
`institution`, `cancel_info`, `carrier`, `payment_account`, `tracking_code_pb`, `message_check`

### Users (3)
`secundary_number`, `active_order`, `active_service`

### services (1)
`professional_paid`

---

## 3. Uso fraco (revisar antes de dropar)

| Collection.campo | Evidência |
|---|---|
| `Kunk_Users.commission_value` | Possível falso positivo (pagarme usa `Partners`) |
| `Kunk_Users.transactions` | Idem |
| `Orders_files.Orders_id` | `documents.js` (upload) |
| `Users_files.Users_id` | `documents.js` |
| `services_files.services_id` | `documents.js` |
| `Partners.commission_value` | `pagarme.js` |
| `Reception.option2` | `customCard.jsx` (genérico) |
| `Reception.isAssociate` | `AddReception.jsx` (write) — **usado** |
| `services.payment_info` | Só string no log; campo real não é gravado |

> `Reception.isAssociate` e junction `*_id` são usados de fato; mantê-los.

---

## 4. Observações importantes

1. **`Orders.at` / `at2` / `at3`** — hipótese histórica de “atendente”; nunca integrados ao código atual.
2. **`Users.met_us`** — existe em Professionals; em Users só há label no FieldSelector.
3. **`Partners_files`** — tabela junction provavelmente morta (sem rota de documentos para parceiros).
4. **`Products.amount`** — confundir com `items[].amount` no pedido (preço unitário copiado do produto).
5. Antes de dropar na migração, **amostrar o PostgreSQL** para ver se há dados populados manualmente.

---

## Regenerar

```bash
cd project-tools && npm run fields:unused
```

---

## Status na migração (v1.1.0)

Os **45 campos** listados em §1 e §2, mais a tabela `Partners_files`, estão em `excluded_fields` / `excluded_tables` do [field-rename-map.json](./field-rename-map.json) e **não entram** no [target-schema.json](../../exports/directus/target-schema.json).

Regenerar schema alvo após mudanças:

```bash
cd project-tools && npm run schema:target
```
