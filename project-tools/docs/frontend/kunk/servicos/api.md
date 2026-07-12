# Serviços — API

> Contratos a implementar / estender em `kunk-api` para a feature Serviços + Profissionais + Google Calendar.

## Prefixo

```
/api/v1
```

---

## 1. Services (domínio)

Rotas existentes em `/services` + CRUD `/items/services`. Estender:

### `GET /services`

Query sugerida:

| Param | Uso |
|---|---|
| `date_from` / `date_to` | `date_created` (default 14 dias no client) |
| `booking_group_code` | Todos do grupo |
| `associate_user_code` | |
| `professional_id` | |
| `tag` | |
| `q` | Busca texto |
| `created_by_user_code` | |

Response: lista de serviços (shape OSS de [fields.md](./fields.md)).

### `GET /services/by-group/:bookingGroupCode`

Equivalente legado `GET …/servicecodes?code=`.

```json
{ "data": [ /* services com mesmo booking_group_code */ ] }
```

### `POST /services`

Body: um serviço **ou** batch:

```json
{
  "associate_user_code": "…",
  "associate_name": "…",
  "associate_email": "…",
  "patient_user_code": null,
  "patient_name": null,
  "booking_group_code": null,
  "observations": "…",
  "tags": [],
  "items": [
    {
      "professional_id": 1,
      "consultation_date": "2026-07-20T14:00:00-03:00",
      "price": 240,
      "donation": 0,
      "price_paid": 0
    },
    {
      "professional_id": 2,
      "consultation_date": "2026-07-21T10:00:00-03:00",
      "price": 110,
      "donation": 0,
      "price_paid": 0
    }
  ]
}
```

`patient_user_code`: UUID do paciente beneficiário, ou `null`/omitido se o atendimento for do próprio responsável. Server valida vínculo `responsible_code` e preenche `patient_name` se omitido.

Server:

1. Se `booking_group_code` omitido/null → gera UUID do grupo.
2. Valida associado; se `patient_user_code`, valida paciente do responsável.
3. Para cada item: snapshot de `professional_name`, `professional_email`, `type`; `service_code` novo; `price` default se omitido; copia `associate_*` + `patient_*` do body.
4. Status default `Aguardando Pagamento`.
5. **Não** chama Pagar.me / não gera `payment_link`.
6. Se `create_calendar_event: true` + `consultation_date` + profissional com `calendar_id` → cria evento e grava `event_id` / `event_link` (template com responsável+paciente se houver).

Response: array criado (mesmo `booking_group_code`).

Campo por item: `create_calendar_event` (bool, default `false`). Sem data → não cria evento mesmo se true.

### `PATCH /services/:id`

Campos editáveis: datas, preços, observations, tags, payment_type, professional_*, status (`Aguardando Pagamento` | `Pagamento Concluído`), event_*.

**Mudança de `consultation_date` com `event_id` existente:** o client deve enviar confirmação explícita, ex. `replace_calendar_event: true`. Sem esse flag → `409 EVENT_DATE_CONFIRMATION_REQUIRED` (ou o client só chama a API após o modal de aprovação). Fluxo aprovado: DELETE evento antigo + POST novo + PATCH.

Troca de profissional: orquestrar move do evento Google (delete + create).

### `DELETE /services/:id`

Se `event_id` + módulo on → tentar deletar evento antes/depois.

### Existentes a manter

- `GET /services/by-professional/:id`
- `GET /services/exists`

---

## 2. Professionals (domínio)

Estender `/professionals` além de `GET` + `PATCH …/donation-balance`.

### `GET /professionals`

Query:

| Param | Uso |
|---|---|
| `active` | `1` / `0` |
| `is_collaborator` | `true` — **obrigatório** no client do Autocomplete de Serviços |
| `is_prescriber` | loja |
| `type` | |
| `q` | busca nome/email |

Response enriquecida (quando módulo Google on):

```json
{
  "data": [
    {
      "id": 1,
      "name": "Ana",
      "type": "medic",
      "consultation_price": 240,
      "is_collaborator": true,
      "calendar_id": "abc@group.calendar.google.com",
      "calendar": {
        "id": "abc@group.calendar.google.com",
        "summary": "Dra. Ana — Consultas",
        "primary": false
      }
    }
  ]
}
```

`calendar` vem de match com `GET calendars` do módulo (cache curto no server). Se módulo off ou id sem match: `calendar: null`.

### `POST /professionals`

CRUD create (ou via `/items/professionals` — preferir domain route para validar `type`, `consultation_price`, `calendar_id`).

Validações:

- `type` ∈ enum documentado
- `consultation_price` ≥ 0 se presente
- `calendar_id` opcional; se presente, deve existir na lista Google (quando módulo on) ou aceitar e avisar

### `PATCH /professionals/:id`

Mesmos campos. Atualizar `calendar_id` permitido.

### `DELETE /professionals/:id`

Soft-delete (`active=0`) preferencial. Hard delete: 409 se houver serviços vinculados (ou cascade política a definir em gaps).

### `PATCH /professionals/:id/donation-balance`

Já existe — manter.

### Schema

Adicionar coluna se ainda não existir no SQL alvo:

```sql
ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS consultation_price NUMERIC(12,2);
```

`calendar_id` já existe no schema OSS.

Normalizar `is_collaborator` / `is_prescriber` para boolean no OSS (migrar `'Sim'`/`'Não'`).

---

## 3. Módulo Google Calendar

Prefixo: `/api/v1/modules/google_calendar`

Doc completa: [`../../api/modules/google_calendar.md`](../../api/modules/google_calendar.md).

Resumo dos endpoints usados pela feature:

| Método | Path | Uso |
|---|---|---|
| `GET` | `/status` | Admin + gate UI |
| `GET` | `/calendars` | Select admin (primary) + select profissional |
| `POST` | `/events` | Agendar serviço |
| `PATCH` | `/events/:eventId` | Remarcar data |
| `DELETE` | `/events/:eventId` | Cancelar / trocar profissional |
| `GET` | `/oauth/authorize` | Assistente |
| `GET` | `/oauth/callback` | Público HTML + postMessage |
| `GET` | `/oauth/status` | Poll |
| `POST` | `/test` | Assistente |

Body create event (legado):

```json
{
  "calendarId": "abc@group.calendar.google.com",
  "summary": "Nome do associado",
  "description": "observações…",
  "start": "2026-07-20T14:00:00-03:00",
  "end": "2026-07-20T15:00:00-03:00",
  "timeZone": "America/Sao_Paulo"
}
```

Duração default 1h se só `start` for enviado. Reminders: e-mail 24h + popup 10 min (legado).

---

## 4. Admin external-services

Incluir `google_calendar` no catálogo:

```
GET/PATCH  /admin/external-services/google_calendar
GET/PUT    /admin/external-services/google_calendar/credentials
DELETE     /admin/external-services/google_calendar/credentials/:fieldKey
POST       /admin/external-services/google_calendar/test
```

`fields_schema` inclui OAuth fields; tokens hidden no form.

`PATCH` body flags:

```json
{
  "enabled": true,
  "use_for_scheduling": true,
  "primary_calendar_id": "primary-or-id"
}
```

---

## 5. api-client (`packages/api-client`)

Expor helpers espelhando Loggi/ME/Geoapify:

- `listExternalServices` — já lista; incluir google_calendar no backend
- `getGoogleCalendars`, `createGoogleCalendarEvent`, …
- `listProfessionals({ is_collaborator: true })`
- `createServicesBatch`, `listServicesByGroup`

---

## 6. Autorização

### Páginas (front)

Gate por `kunk.role_pages` (admin). Default `"*"` → Produção, Acolhimento e Administrador veem Serviços.

### Collections (API)

| Recurso | read | create/update/delete |
|---|---|---|
| services | Roles com página + matriz RBAC | Idem |
| professionals | Idem | Soft-delete = update `active` |
| modules/google_calendar | Quem agenda serviços | eventos: mesmos papéis |
| admin/external-services | Administrador | Administrador |
| admin role_pages | Administrador | Administrador |

Ao implementar: em `rbac.js`, **Produção** deve ter pelo menos `RU` em `services` e `services_files` (hoje não tem `services` — alinhar com allow-all de páginas).

Upload comprovante (`services_files` create): além do arquivo, PATCH `status = Pagamento Concluído` no serviço (e nos IDs do grupo se aplicável).
