# Associados — API (`kunk-api`)

> Contratos para a página de cadastramento/associados no painel.
> Auth: cookie de **operador** (`system_users`). RBAC: collection `users` (+ `users_files`, `orders`, `services`, `reception`).

## 1. Listagem e detalhe

| Método | Path | Uso |
|---|---|---|
| `GET /items/users` | Lista com filtros/sort/limit; excluir `status=patient` no front ou via filter | |
| `GET /items/users?filter[user_code][_eq]=` | Deep link `?a=` | |
| `GET /users/code/:userCode` | Atalho por código (se já existir `getByCode`) | |
| `GET /users/search?q=` | Busca rápida (já usado em Serviços) | |
| `POST /items/users` | Criar associado (painel: e-mail). Create ainda aceita `user_code` / `status` | |
| `PATCH /items/users/:id` | Atualizar dados cadastrais / annotations / prescritor / endereço. Funil, `user_code` e sessão são readonly | |
| `POST /users/:id/make-associate` | Tornar associado: `status=Associado` + `associate_status=assinatura_termo` (não gera termo) | |
| `DELETE /items/users/:id` | Excluir só se sem pedidos, serviços e pacientes (**409** `HAS_LINKED_RECORDS`) | |

Query útil: `?patients=1` — hidrata pacientes no responsável (`hydratePatients` / `responsible_code`).

### Filtros sugeridos (lista painel)

- `status[_neq]=patient`
- sort `created_date` / `date_created` desc
- limit default 60; “carregar mais” aumenta

---

## 2. Pacientes

| Método | Path | Uso |
|---|---|---|
| `GET /users/:id/patients` | Lista `WHERE responsible_code = user.user_code` | |
| `POST /users/:id/patients` | Cria paciente (`status=patient`, `responsible_code` setado) | |
| `PATCH /users/:id/patients/:patientId` | Edita paciente | |
| `DELETE /users/:id/patients/:patientId` | Remove paciente | |

**Não** expor endpoints de “set active patient” / patch de `patient_user_code` para o painel operacional.

Payload create paciente (mínimo): nome, sobrenome, + campos do form; server seta `user_code`, `status=patient`, `responsible_code`.

---

## 3. Anotações

Opção A (simples, legado): PATCH `users.annotations` com array completo.

Opção B (se preferir):

| Método | Path |
|---|---|
| `POST /users/:id/annotations` | Append |
| `DELETE /users/:id/annotations/:annotationId` | Remove |

Server injeta `userName` / `user_code` do operador autenticado e `date_created`.

---

## 4. Histórico

| Método | Path | Uso |
|---|---|---|
| `GET /users/:id/history` | Agrega pedidos + serviços | |
| ou `GET /orders?filter[user_code]=` + `GET /services?filter[associate_user_code]=` | Dois requests no front | |

Resposta agregada sugerida:

```json
{
  "data": {
    "orders": [ /* … */ ],
    "services": [ /* … */ ]
  }
}
```

---

## 5. Documentos

Reutilizar rotas de files já usadas pelo `FileUpload`:

| Método | Path |
|---|---|
| `POST /files` (multipart) + attach user | Upload |
| `GET` list user files por `userId` + `docKind` | Lista |
| `DELETE /files/:id` | Remove |

Metadados em `users_files`: `doc_kind`, `subject`, `doc_type`, `side`.

---

## 6. Termo (stub)

| Método | Path | Resposta v1 |
|---|---|---|
| `POST /terms/contracts` | **501/503** `TERMS_MODULE_IN_DEVELOPMENT` | |
| `GET /terms/status?user_code=` | Idem ou `{ status: "unavailable" }` | |

Front pode nem chamar — só toast. Se chamar, **não** persistir nada.

---

## 7. Triagem a partir do associado

| Método | Path | Uso |
|---|---|---|
| `POST /items/reception` ou rota domain | Cria item na fila com dados do associado | |

Alinhado à spec de [triagem/api.md](../triagem/api.md).

---

## 8. Serviços — create com beneficiário

Estender create de serviços:

```json
{
  "associate_user_code": "uuid-responsavel",
  "patient_user_code": "uuid-paciente-ou-null",
  "professional_ids": ["…"],
  "…"
}
```

Server:

1. Valida associado existe e não é `patient` (ou aceita responsável)
2. Se `patient_user_code`: valida `responsible_code` do paciente = associado
3. Snapshot `associate_*` do responsável; `patient_name` do paciente
4. Demais regras de [servicos/api.md](../servicos/api.md)

---

## 9. Search global

Ver [search-global/api.md](../search-global/api.md) — `GET /search`.

---

## 10. RBAC

| Collection | Acolhimento (mínimo) |
|---|---|
| `users` | CRU (D conforme gaps) |
| `users_files` | CRUD |
| `files` | CRUD |
| `orders` / `services` | R (histórico) |
| `reception` | CR (enviar triagem) |
| `professionals` | R (aba prescritor) |
