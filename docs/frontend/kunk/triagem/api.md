# Triagem — API (`kunk-api`)

## Já existente (base)

| Método | Rota | Auth | Uso |
|---|---|---|---|
| `POST` | `/reception` | create reception | Criar contato (estender para form público + link e-mail) |
| `PATCH` | `/reception/:id/complete` | update | Marca concluído + `completion_reason` |
| `PATCH` | `/reception/:id/attendant` | update | Atribuir atendente |
| CRUD | `/items/reception` | RBAC | Lista/filtro/update genérico da página operacional |
| Config | `/config`, `/config/public` | admin / público | Form, statuses, módulos (`system=triage`) |

Ver `kunk-api/src/routes/reception.js` + `receptionService.js`.

---

## Extensões necessárias na implementação

### 1. Criação pública / form

**Opção A (preferida):** `POST /reception/public` (sem role operacional; 429 `RATE_LIMITED` após 5 / 15 min / IP; honeypot/captcha futuro)

Body: campos do schema do form + `custom_fields: { [id]: value }`.

Comportamento:

1. Validar contra `triage.form.fields` + `triage.form.custom_fields` (só enabled; required).
2. Resolver status de entrada (`is_default_entry`).
3. Criar row `reception`.
4. Se e-mail → lookup `users` → set `associate_code` / `associate_name`.
5. Persistir custom em `tags.custom_fields`.

**Opção B:** reutilizar `POST /reception` com authorize frouxo — menos claro; evitar.

### 2. Schema do form (público)

`GET /reception/form-schema` → `{ fields, custom_fields, title? }` resolvido da config (sem vazar keys sensíveis).

Alternativa: `GET /config/public?system=triage` se as keys forem todas públicas.

### 3. Atualizar status

`PATCH /items/reception/:id` com `{ status }` **ou** endpoint dedicado:

`PATCH /reception/:id/status` `{ status }` — valida se `status` ∈ `triage.statuses[].value`.

### 4. Link manual de associado

`PATCH /reception/:id/link` `{ associate_code }` / `POST .../unlink`

- Resolve nome a partir de `users`.
- Limpa ou preenche `associate_name`, `is_associate`, avatar se aplicável.

### 5. Conclusão / contabilização

Já existe `PATCH /reception/:id/complete` com `completion_reason`.

Garantir uso ao criar pedido/serviço:

- Pedidos: após create order, buscar reception aberta por e-mail/`associate_code` e `complete('Pedido')`.
- Serviços: idem com `'Serviço'` (e/ou `'Agendamento'` no redirect).

Endpoint auxiliar opcional:

`GET /reception/open-by-email?email=` ou `?associate_code=` — espelha histórico `/reception/user?email=`.

### 6. Contagens por status

- Client-side: filtrar lista já carregada , **ou**
- `GET /reception/status-counts` → `{ waiting: 12, done: 3, ... }` para sidebar sem baixar tudo.

Preferir counts no server se a fila for grande.

### 7. Config admin

Sem mudança de contrato: CRUD `/config` com `system=triage`. Seed das keys em SQL.

---

## Lookup de associado por e-mail

```
SELECT user_code, name, last_name, email, avatar_url, ...
FROM users
WHERE lower(trim(email)) = lower(trim($1))
LIMIT 1
```

Normalizar e-mail antes de gravar em `reception` e antes do match.

---

## RBAC

| Ação | Role típico |
|---|---|
| Operar triagem (list/update) | Acolhimento, Administrador, Produção (alinhar `rbac.js`) |
| Completar / attendant | update reception |
| Config form/status/módulos | Administrador |
| Form público POST | público (rota dedicada) |

---

## Fora da API v1 da triagem

- Qualquer rota Utalk / Beeviral
- Agregações de doações (`sum(orders.donation)` etc.) para modal de histórico
