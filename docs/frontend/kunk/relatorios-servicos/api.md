# Relatórios de serviços — API (`kunk-api`)

> Contratos para o relatório de serviços (staff + portal profissional).
> Auth: cookie `session_token` (`system_users`).
> Collections: `services`, `professionals`, `system_users`, `system_configs`.

## 1. Autorização

| Role | Capacidade |
|---|---|
| Administrador / Acolhimento / Financeiro (e staff com `role_pages`) | Listar todos; PATCH validation; PATCH contest_reports (resolver) |
| `Profissional` | READ escopado ao `internal_code` (`services.professional_id` e `professionals.professional_code`); APPEND contestação no próprio cadastro; **sem** aprovar linhas, **sem** saldo/convite de portal |
| Produção | Conforme `role_pages` (default pode incluir relatório se `*`) |

### Escopo obrigatório (role `Profissional`)

Em qualquer listagem de serviços do relatório:

```
WHERE professional_id = :session.internal_code
  AND status = 'Pagamento Concluído'
  AND consultation_date IS NOT NULL
```

Ignorar / rejeitar tentativas do cliente de ampliar o filtro.  
`internal_code` inválido ou sem profissional → 403 / lista vazia.  
Staff: mesmos filtros de status + data obrigatória.

Atualizar [`../../api/authorization.md`](../../api/authorization.md): role `Profissional` (colaboradores com portal). **Não** usar role `Prescritor` neste módulo.

---

## 2. Listagem do relatório

Opção A — domínio dedicado (preferida):

| Método | Path | Uso |
|---|---|---|
| `GET /services/reports` | Lista agregável p/ UI | |

Query params:

| Param | Descrição |
|---|---|
| `month` | `YYYY-MM` **ou** omitir p/ ano corrente / todos (definir na impl.) |
| `professional_id` | UUID — **só staff**; ignorado/forçado no portal |
| `status` | Fixo server-side `Pagamento Concluído` (não confiar no client) |

Resposta sugerida:

```json
{
  "data": {
    "services": [ /* rows + payable calculado */ ],
    "professionals": [ /* subset com contest_reports */ ],
    "types": [ /* catálogo p/ fee lookup no client ou já embutir payable */ ],
    "totals": { "count": 12, "payable_sum": 2400.0 }
  }
}
```

Cada service na resposta deve incluir pelo menos:

```json
{
  "id": 1,
  "service_code": "…",
  "consultation_date": "2026-03-10T14:00:00.000Z",
  "associate_name": "…",
  "professional_id": "…",
  "professional_name": "…",
  "type": "medic",
  "price": 220,
  "donation": 0,
  "price_paid": 220,
  "commission_validation": null,
  "association_fee": 20,
  "donation": 0,
  "deduct_donation": false,
  "payable": 200
}
```

`association_fee`, `deduct_donation` e `payable` calculados no **server** (catálogo + `report_settings`).

Opção B — composição no front:

- `GET /items/services?filter[status][_eq]=Pagamento Concluído&filter[consultation_date][_gte]=…`
- `GET /items/professionals` (portal: só o registro cujo `professional_code` = `internal_code`)
- `GET /configs/services/professional_types`

Com escopo aplicado no repository para role Profissional. Preferir Opção A se o cálculo e o escopo ficarem espalhados demais.

---

## 3. Validação por linha (staff)

| Método | Path | Body |
|---|---|---|
| `PATCH /services/:id` | `{ "commission_validation": "approved" \| "contested" \| null }` |
| `POST /services/reports/validate` | `{ "ids": [1,2], "commission_validation": "approved" }` | lote |

RBAC: update em `services`. Role `Profissional` → **403**.

---

## 4. Contestações (`contest_reports`)

| Método | Path | Quem | Body |
|---|---|---|---|
| `POST /professionals/:id/contest-reports` | Profissional (próprio) ou staff | `{ "text": "…", "month": "março 2026" }` |
| `DELETE /professionals/:id/contest-reports/:index` | Staff | — |
| ou `PATCH /professionals/:id` | Staff | `{ "contest_reports": [ … ] }` array completo |

Server injeta `date` ISO.  
Profissional só pode append no próprio registro (`professional_code === internal_code`).  
`GET`/`PATCH /professionals` e `/items/professionals` no portal filtram o mesmo código. O PATCH do portal **não** aceita `donation_balance`, `contest_reports` nem flags de cadastro — contestação só no POST acima.

---

## 5. Catálogo de tipos e settings do relatório

| Método | Path | Uso |
|---|---|---|
| `GET /configs/services/professional-types` | Leitura |
| `PUT /configs/services/professional-types` | Admin — JSON validado |
| `GET /configs/services/report-settings` | `{ deduct_donation_from_payable }` |
| `PUT /configs/services/report-settings` | Admin |

Validação tipos: `id` único; `association_fee >= 0`; `default_consultation_price` null ou `>= 0`; preferir `active: false` a apagar ids em uso.

Helpers:

```js
resolveConsultationPrice(professional, typeConfig)
resolvePayable(service, typeConfig, reportSettings)
```

---

## 6. Conta do profissional + convite

Caminho principal: a partir de `/app/profissionais`.

| Método | Path | Notas |
|---|---|---|
| `POST /professionals/:id/portal-access` | **Só staff.** Cria `system_users` (role só `Profissional`) + gera token de convite com **expiração** |
| `POST /professionals/:id/portal-access/resend` | **Só staff.** Novo token; invalida o anterior |
| `PATCH /professionals/:id/donation-balance` | **Só staff.** Portal (role só `Profissional`) recebe 403, inclusive no próprio cadastro |
| `GET /system-users?filter[internal_code]=` | Status da conta |
| `GET/POST` aceite em `/cadastro` | Mesma lógica do convite de operadores (legado `systemUserSign`) |

Resposta de `portal-access` sugerida:

```json
{
  "data": {
    "system_user_id": 12,
    "invite_url": "https://app…/cadastro?data=…",
    "expires_at": "2026-07-12T19:00:00.000Z",
    "email_sent": false,
    "email_status": "module_not_configured"
  }
}
```

| Campo | Significado |
|---|---|
| `email_sent` | `true` só se o módulo de e-mail enviar de fato |
| `email_status` | `module_not_configured` \| `sent` \| `failed` — UI mostra copiar link se não enviado |

**Integração futura:** quando SMTP/e-mail existir, o mesmo endpoint passa a enviar o convite sem mudar o contrato do front (ver [gaps.md](./gaps.md)).

Guards pós-login: role `Profissional` → só `/relatorio/servicos`; API recusa collections fora do escopo do portal.

---

## 7. Auth redirect

| Role | Pós-login |
|---|---|
| Staff | `/app` (como hoje) |
| `Profissional` | **somente** `/relatorio/servicos` — bloquear `/app/*` |

`GET /auth/me` deve expor `permissions` + `internal_code` para o front montar o portal.

---

## 8. Schema / SQL

| Mudança | Motivo |
|---|---|
| `services.commission_validation VARCHAR` | Aprovar/contestar linha |
| Seed `system_configs` `professional_types` | Taxas e preços padrão |
| RBAC `Profissional` | Portal escopado |

Já existentes: `professionals.contest_reports`, `professional_code`, `consultation_price`.

---

## 9. Fora da API v1

| Endpoint legado / ideia | Decisão |
|---|---|
| Webhook n8n pagamento | Não |
| Utalk message | Não |
| Cupons do prescritor no relatório | Não |
| Relatório de pedidos | Não |
