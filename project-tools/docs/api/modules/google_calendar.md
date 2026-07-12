# Módulo Google Calendar (agenda de serviços)

> Portar o fluxo do kunkserver (`routes/googleCalendar.js`, `modules/googleCalendar.js`) para `/api/v1/modules/google_calendar`.
> Spec de produto: [`../../frontend/kunk/servicos/README.md`](../../frontend/kunk/servicos/README.md).
> Docs Google: [Calendar API](https://developers.google.com/calendar/api/guides/overview), [OAuth 2.0](https://developers.google.com/identity/protocols/oauth2).

## Ativação

| Flag | Origem |
|---|---|
| `MODULE_GOOGLE_CALENDAR_ENABLED=true` | Env |
| `modules.google_calendar.enabled` | `system_configs` |
| `modules.google_calendar.use_for_scheduling` | default `true` — toggle no admin |
| `modules.google_calendar.primary_calendar_id` | Calendário principal da aplicação (select no admin) |

Desabilitado no env → `503 MODULE_DISABLED`.  
`use_for_scheduling=false` → `403 SCHEDULING_DISABLED` em create/update/delete de eventos.

## Prefixo

```
/api/v1/modules/google_calendar
```

## Credenciais

Ver [credentials.md](./credentials.md).

| field_key | secret | env_fallback | Notas |
|---|---|---|---|
| `client_id` | sim | `GOOGLE_CLIENT_ID` | OAuth client |
| `client_secret` | sim | `GOOGLE_CLIENT_SECRET` | |
| `redirect_uri` | não | `GOOGLE_REDIRECT_URI` / `PUBLIC_API_URL` | Calculada pela API (`…/modules/google_calendar/oauth/callback`); admin só exibe para copiar |
| `refresh_token` | sim | `GOOGLE_REFRESH_TOKEN` | Só via OAuth (hidden no form) |
| `access_token` | sim | — | Renovado no server; hidden |

Cascata: DB → env. Tokens OAuth **nunca** retornam ao frontend.

Scopes sugeridos:

```
https://www.googleapis.com/auth/calendar
```

(ou `calendar.events` + `calendar.readonly` se quiser menor privilégio — desde que liste calendários e CRUD events).

## Modelo: calendário principal + secundários

```
OAuth (1 refresh_token da conta da associação)
  → calendarList.list()
      → Calendário PRINCIPAL  → modules.google_calendar.primary_calendar_id
      → Calendários SECUNDÁRIOS → professionals.calendar_id (um por profissional)
```

A associação:

1. Cria/escolhe o calendário **principal** pertencente a ela.
2. Adiciona calendários **secundários** para cada profissional necessário (compartilhados com a conta OAuth).
3. No cadastro do profissional, grava o id do secundário em `calendar_id`.

Agendamento de serviço:

1. Lê `professionals.calendar_id` (secundário)
2. Se vazio → `CALENDAR_NOT_CONFIGURED`
3. Cria evento nesse `calendarId` — **nunca** no `primary_calendar_id`

## Admin

Em **Serviços externos → Google Calendar**:

1. Siga o passo a passo na tela (Google Cloud Console → Calendar API → OAuth client Web).
2. Copie a **Redirect URI** exibida no admin para o console Google.
3. Informe só `client_id` / `client_secret` (a API grava a redirect automaticamente via `PUBLIC_API_URL` ou host da requisição).
4. **Autenticar** (salva, testa e abre popup OAuth — padrão Melhor Envio).
5. Selecione o **calendário principal** da associação (não é destino de eventos de consulta).
6. Marque habilitado + “Usar no agendamento”.

Se as rows de `system_api_credentials` ainda não existirem, a API cria os metadados automaticamente no GET/PUT do serviço (`ensureCredentialRows`).

## Endpoints

### `GET /status`

```json
{
  "data": {
    "module": "google_calendar",
    "enabled": true,
    "use_for_scheduling": true,
    "primary_calendar_id": "abc@group.calendar.google.com",
    "credentials_complete": true,
    "credentials_source": "db",
    "oauth_connected": true
  }
}
```

### `GET /calendars`

Lista agendas da conta autorizada (`calendarList.list`).

```json
{
  "data": [
    {
      "id": "primary",
      "summary": "Associação",
      "primary": true,
      "accessRole": "owner",
      "backgroundColor": "#9fe1e7"
    },
    {
      "id": "xyz@group.calendar.google.com",
      "summary": "Dr. João",
      "primary": false,
      "accessRole": "writer"
    }
  ]
}
```

Usado por: select do calendário principal (admin) e select de agenda no cadastro de profissional.

### `POST /events`

```json
{
  "calendarId": "xyz@group.calendar.google.com",
  "summary": "Maria Silva",
  "description": "Observações do atendimento…",
  "start": "2026-07-20T14:00:00-03:00",
  "end": "2026-07-20T15:00:00-03:00",
  "timeZone": "America/Sao_Paulo",
  "service_id": 123
}
```

- Se `end` omitido → `start + 1h`.
- Reminders (legado): email 24h antes; popup 10 min.
- `service_id` opcional: se enviado, API pode PATCH `event_id` / `event_link` no serviço.

Response:

```json
{
  "data": {
    "event_id": "…",
    "event_link": "https://www.google.com/calendar/event?eid=…",
    "calendar_id": "xyz@group.calendar.google.com"
  }
}
```

### `PATCH /events/:eventId`

Query/body: `calendarId` (obrigatório), `start`, `end`, `summary`, `description`.

### `DELETE /events/:eventId`

Query: `calendarId` obrigatório.

### OAuth

| Path | Papel |
|---|---|
| `GET /oauth/authorize` | Redirect URL / abre consent Google |
| `GET /oauth/callback` | Público; HTML com `postMessage({ type: 'google-calendar-oauth', ok })` |
| `GET /oauth/status` | `{ connected, has_refresh_token }` para poll do assistente |

Após callback: persistir `refresh_token` (e access) criptografados; **somente se** o fluxo OAuth completar.

### `POST /test`

Valida credenciais: refresh access token + `calendarList.list` (ou get primary).  
Usado pelo assistente; falha → **não** persistir secrets novos.

## Consumo no Kunk

| Tela | Uso |
|---|---|
| Serviços — create com checkbox | `POST /events` se marcado + data + `calendar_id` |
| Serviços — botão Agendar | Idem para serviço já existente sem evento |
| Serviços — editar data com evento | Client pede aprovação → `DELETE` + `POST` |
| Serviços — trocar profissional | `DELETE` + `POST` |
| Serviços — excluir | `DELETE` evento se `event_id` |
| Profissionais — dialog | `GET /calendars` → select secundário (`calendar_id`) |
| Admin | OAuth + primary + enable |

## Erros

| Code | HTTP | Quando |
|---|---|---|
| `MODULE_DISABLED` | 503 | Env/config off |
| `SCHEDULING_DISABLED` | 403 | Flag use_for_scheduling false |
| `CREDENTIAL_MISSING` | 400 | Sem OAuth/client |
| `OAUTH_REQUIRED` | 401 | Sem refresh_token / token inválido |
| `CALENDAR_NOT_CONFIGURED` | 400 | Profissional sem `calendar_id` |
| `CALENDAR_NOT_FOUND` | 404 | Agenda inexistente ou inacessível na conta OAuth |
| `CALENDAR_FORBIDDEN` | 403 | Conta OAuth sem permissão na agenda |
| `EVENT_NOT_FOUND` | 404 | Evento já removido no Google |
| `GOOGLE_VALIDATION_ERROR` | 400 | Payload rejeitado pelo Google |
| `GOOGLE_CONFLICT` | 409 | Conflito ao atualizar evento |
| `RATE_LIMITED` | 429 | Quota Google |
| `GOOGLE_API_ERROR` | 502 | Upstream / indisponibilidade |

Mensagens são em português e **não** incluem o JSON cru da Calendar API. Detalhes técnicos (`google_status`, `google_reason`, `path`) vão só em `errors[].details`.

## Implementação sugerida (pastas)

```
kunk-api/src/routes/modules/google_calendar.js
kunk-api/src/services/google_calendar/
  client.js      ← OAuth + googleapis calendar
  calendars.js   ← list
  events.js      ← create/update/delete
  auth.js        ← authorize URL, callback, refresh
```

Registrar em `MODULE_NAMES`, `externalServices.js` `SERVICES`, seed SQL, `.env.example`.
