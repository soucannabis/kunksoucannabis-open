# Mapa oficial de rename (`old → new`)

Arquivo: [`field-rename-map.json`](./field-rename-map.json)

Schema resultante: [`target-schema.json`](../../exports/directus/target-schema.json) (gerado por `npm run schema:target`).

## Conteúdo

| Chave | Uso |
|---|---|
| `tables` | Tabelas mantidas + rename `snake_case` |
| `excluded_tables` | Tabelas **removidas** do novo banco |
| `fields` | Renames aprovados (`old` → `new`) |
| `excluded_fields` | Campos **removidos** (não usados + só metadado) |
| `lookup` | Índice `old → new` para scripts |
| `deferred` | Decisões ainda pendentes |

## Estatísticas (v1.1.0)

| Métrica | Valor |
|---|---:|
| Tabelas no novo banco | **14** |
| Campos no novo banco | **290** |
| Tabelas excluídas | **2** (`Coupons`, `Partners_files`) |
| Renames aplicados | **58** |
| Decisões resolvidas | **6** |
| Decisões pendentes | **0** |

### Tabelas excluídas

| Tabela | Motivo |
|---|---|
| `Coupons` | Estrutura de cupons fora do escopo open source |
| `Partners_files` | Junction morta (sem upload de documentos) |

Campos removidos junto com Coupons: `Orders.coupon_id`, `services.coupon_id`.

### Decisões aplicadas (v1.1.0)

| Campo | Novo nome |
|---|---|
| `Orders.partner` | `partner_name` |
| `Users.partner` | `partner_name` |
| `Users.responsible_for` | `patient_user_code` |
| `Users.handbook` | mantido |
| `services.professional` | `professional_id` |
| `Professionals.is_collaborator` | mantido |

`Users` e `Orders` mantêm `partner_code` separado do nome.

## Exclusões (v1.1.0)

Campos **não usados** e **só metadado** (FieldSelector) foram removidos do schema alvo.
Fonte: [unused-fields.md](./unused-fields.md).

Tabela inteira removida:

- `Partners_files` → junction sem upload de documentos no código

## Regenerar schema alvo

```bash
cd project-tools
npm run fields:unused    # opcional: atualizar análise
npm run schema:target    # aplica exclusões + gera target-schema.json
```

## Status

`status: "proposed"` — aprovar antes de gerar migrations SQL.
