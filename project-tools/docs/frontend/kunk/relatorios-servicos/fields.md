# Relatórios de serviços — Campos

## 1. Dados do relatório (origem)

Fonte principal: `services` com `status = 'Pagamento Concluído'`.

| Campo OSS | Uso no relatório |
|---|---|
| `id` / `service_code` | Identidade / PATCH validation |
| `consultation_date` | Agrupamento mês/ano + coluna Data; **obrigatória** para entrar no relatório |
| `associate_user_code` / `associate_name` | Coluna Associado |
| `patient_user_code` / `patient_name` | Modal detalhe (se houver) |
| `professional_id` | FK → `professionals.professional_code` |
| `professional_name` | Agrupamento / label |
| `type` | Modalidade do atendimento (consulta/retorno/…); **não** define a taxa |
| `price` | Valor da consulta |
| `donation` | Coluna Doação (legado `donate`) |
| `price_paid` | Coluna Valor pago (se exibir; legado calculava `price − donate` em alguns lugares) |
| `tags` | Exibição opcional; **sem** bônus por tag no cálculo OSS |
| `commission_validation` | `null` \| `approved` \| `contested` |
| `status` | Filtro fixo: só `Pagamento Concluído` |

Cálculo **a receber** (server-side): `payable = max(0, price − association_fee[− donation se flag])`, onde `association_fee` vem do tipo do **profissional** no catálogo admin (`professionals.type` → `services.professional_types`).

### `commission_validation` (reintroduzir no schema)

Campo legado `validation` foi removido no alter OSS; o relatório **precisa** dele de volta com nome claro:

| Valor | Significado |
|---|---|
| `null` / ausente | Ainda não revisado |
| `approved` | Staff aprovou a linha |
| `contested` | Staff marcou contestado |

SQL sugerido: `ALTER TABLE services ADD COLUMN IF NOT EXISTS commission_validation VARCHAR(32);`

---

## 2. `professionals` (contestação + vínculo)

| Campo | Uso |
|---|---|
| `professional_code` | Escopo do portal (`system_users.internal_code`) |
| `name` / `last_name` | Labels |
| `type` | Tipo no cadastro (deve existir no catálogo admin) |
| `consultation_price` | Default de create **só se** o tipo não tiver `default_consultation_price` |
| `phone` / `email` | Contato; e-mail p/ convite de conta |
| `contest_reports` | Array JSONB de contestações do relatório |
| `active` | Soft-delete |
| `is_collaborator` | Quem tipicamente entra no relatório de serviços |

### Shape de `contest_reports[]`

```json
{
  "text": "Falta o atendimento do dia 12",
  "date": "2026-03-15T18:20:00.000Z",
  "month": "março 2026"
}
```

| Campo | Obrigatório | Notas |
|---|---|---|
| `text` | sim | Motivo |
| `date` | sim | ISO — exibição no card |
| `month` | sim | Label igual ao filtro de mês (`formatMonthYear`) |

Legado: `info_report` → OSS: `contest_reports` (já no `target-schema.sql`).

---

## 3. `system_users` (portal)

| Campo | Valor para portal |
|---|---|
| `permissions` | inclui `"Profissional"` |
| `internal_code` | `professionals.professional_code` (string UUID) |
| `email` | Login |
| `password` | Hash (nunca retornar) |
| `status` | ativo / inativo |

RBAC escopado: `WHERE services.professional_id = session.internal_code`.

---

## 4. Catálogo de tipos e regras do relatório (`system_configs`)

### 4.1 Tipos — key `professional_types`

| Coluna | Valor |
|---|---|
| `system` | `services` |
| `key` | `professional_types` |
| `value` | JSON (array de tipos) |

### Shape de cada tipo

```json
{
  "id": "medic",
  "label": "Médico",
  "association_fee": 0,
  "default_consultation_price": null,
  "active": true,
  "sort": 10
}
```

| Campo | Tipo | Default | Descrição |
|---|---|---|---|
| `id` | string | — | Código estável; gravado em `professionals.type` e `services.type` |
| `label` | string | — | Label PT na UI |
| `association_fee` | number | **`0`** | Valor (R$) retido pela associação; **sempre** subtraído do `price` no relatório conforme config |
| `default_consultation_price` | number \| null | **`null`** | Se não-nulo, **anula** `professionals.consultation_price` no create do serviço |
| `active` | bool | `true` | Tipos inativos não aparecem no select de novos profissionais |
| `sort` | int | — | Ordem no select |

### Seed canônico (fee = 0, price = null)

| `id` | `label` |
|---|---|
| `medic` | Médico |
| `psychiatrist` | Psiquiatra |
| `psico` | Psicólogo |
| `therapist` | Terapeuta |
| `assist_social` | Assistente Social |
| `physiotherapist` | Fisioterapeuta |
| `dentist` | Dentista |
| `vet` | Veterinário |

Admin pode **criar tipos novos** e editar fees/preços.

### 4.2 Flag do relatório — key `report_settings`

| Coluna | Valor |
|---|---|
| `system` | `services` |
| `key` | `report_settings` |
| `value` | JSON |

```json
{
  "deduct_donation_from_payable": false
}
```

| Campo | Default | Descrição |
|---|---|---|
| `deduct_donation_from_payable` | **`false`** | Se `true`, a doação do serviço entra no desconto do valor a pagar ao profissional |

Sou Cannabis: manter `false` (doação não desconta o profissional). Outras associações podem ligar a opção no admin.

### Exemplo Sou Cannabis (instância — não seed)

```json
// professional_types (trecho)
[
  { "id": "medic", "label": "Médico", "association_fee": 20, "default_consultation_price": 240 },
  { "id": "therapist", "label": "Terapeuta", "association_fee": 10, "default_consultation_price": 110 }
]

// report_settings
{ "deduct_donation_from_payable": false }
```

---

## 5. Fórmulas

### Valor a receber (payable)

```
fee = catalog[service.type].association_fee ?? 0
payable = Number(service.price || 0) - fee

if report_settings.deduct_donation_from_payable:
  payable = payable - Number(service.donation || 0)

payable = max(0, payable)
```

A taxa do admin **sempre** se aplica (não depende do preço coincidir com o default).

| Exemplo | `price` | fee | donation | flag doação | `payable` |
|---|---|---|---|---|---|
| OSS default | 220 | 0 | 20 | false | **220** |
| SC médico | 220 | 20 | 20 | false | **200** |
| SC + flag on | 220 | 20 | 20 | true | **180** |
| Fee > price | 5 | 20 | 0 | false | **0** |

### Valor pago (coluna informativa)

Preferir `price_paid` quando preenchido; senão `price − donation` na UI — **sem** afetar `payable` a menos que a flag esteja ligada.

### Default de `price` no create do serviço

```
typeConfig = catalog[professional.type]
if typeConfig.default_consultation_price != null:
  price = typeConfig.default_consultation_price
else:
  price = professional.consultation_price ?? 0
```

### Inclusão no relatório

```
status === "Pagamento Concluído"
AND consultation_date IS NOT NULL
AND consultation_date é data válida
```

Sem data de consulta → **fora** do relatório (não aparece, não soma).

---

## 6. Nomes legado → OSS

| Legado | OSS |
|---|---|
| `date` | `consultation_date` |
| `donate` | `donation` |
| `validation` | `commission_validation` |
| `info_report` | `contest_reports` |
| `Prescritor` / portal pedidos | Fora deste módulo — só role `Profissional` (colaboradores) |
| `?p=` = professional_code | `internal_code` / `professional_code` |

---

## 7. Fora do modelo v1

| Conceito legado | Decisão |
|---|---|
| Bônus +10 tags terapeuta | Não modelar |
| Cupons / `donation_balance` no relatório | Fora |
| `recipient_id` / split Pagar.me | Fora |
| Webhook pagamento | Fora |
