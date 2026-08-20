# Serviços — Campos

## 1. `services` (domínio)

Nomes OSS (histórico entre parênteses quando diferente).

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `id` | serial | PK | |
| `service_code` | uuid | sim | Único por linha (`uuidv4` no create) |
| `booking_group_code` | varchar/uuid | sim | **Grupo** — histórico `code`; compartilhado entre linhas do mesmo associado/sessão |
| `status` | varchar | sim | Ver statuses abaixo |
| `name` | varchar | não | Label opcional |
| `type` | varchar | sim | Cópia do `professionals.type` no momento do create |
| `associate_user_code` | varchar | sim | Histórico `associate` — **sempre o responsável** |
| `associate_name` | varchar | sim | Snapshot do responsável |
| `associate_email` | varchar | não | Snapshot |
| `patient_user_code` | uuid | não | **Novo** — paciente beneficiário; `null` = atendimento ao responsável |
| `patient_name` | varchar | não | Snapshot do paciente (quando houver) |
| `professional_id` | int/varchar | sim | FK lógica → `professionals.id` |
| `professional_name` | varchar | sim | Snapshot |
| `professional_email` | varchar | não | Snapshot |
| `consultation_date` | timestamptz | não | Histórico `date` — data/hora do atendimento |
| `price` | numeric | não | Valor da consulta (default do profissional) |
| `donation` | numeric | não | Histórico `donate` |
| `price_paid` | numeric | não | Registro manual do valor pago — **sem** checkout |
| `observations` | text | não | Template + edição livre |
| `tags` | json/array | não | |
| `payment_type` | varchar | não | Enum manual (Pix, Boleto, …) — **sem** `payment_link` |
| `event_id` | varchar | não | ID do evento Google |
| `event_link` | varchar | não | HTML link do evento |
| `created_by_user_code` | varchar | não | Histórico `kunk_user` |
| `date_created` | timestamptz | sim | |

### Fora de escopo v1 (não usar na UI / não gerar)

| Campversões anteriores / OSS | Motivo |
|---|---|
| `payment_link` | Checkout Pagar.me |
| `payment_code` | Idem |
| `payment_info` | Payload de pagamento |
| `coupon_id` | Cupons |
| `bvid` / Beeviral | Removido |

Campos podem existir no schema por compatibilidade; a UI de Serviços **não** cria nem exibe fluxo de checkout.

### Status (pagamento operacional — sem checkout)

Manter os status de pagamento anteriores na UI e no domínio. Toggle manual e comprovante permanecem. Com módulo `pagarme` ativo, PaymentModal / `payment_link` entram conforme [`../pagamentos-soucannabis/`](../pagamentos-soucannabis/README.md) (sem sync Pedidos SC).

| Status | Uso |
|---|---|
| `Aguardando Pagamento` | Default no create |
| `Pagamento Concluído` | Operador confirma via toggle **ou** ao **enviar comprovante** |

Filtro/toggle pago vs pendente na barra (em versões anteriores) **permanece**.

### `payment_type` (manual, igual histórico)

`Pix` · `Boleto` · `Cartão` · `Crédito Associação` · `Permuta` · `Doação integral` · `Serviço gratuito` · `Mudas`

---

## 2. `professionals`

Uma única tabela. Dois papéis via flags (independentes; um registro pode ter ambas):

| Papel | Flag | Origem típica | Uso |
|---|---|---|---|
| **Colaborador** | `is_collaborator` | Profissional da associação (atendimento terapêutico / consulta) | Aparece no input de **Serviços**; tem `consultation_price` e `calendar_id` |
| **Prescritor** | `is_prescriber` | Emite receitas; pode ser da associação **ou** cadastrado a partir da receita que o associado apresentou (sem contato com o médico) | Prescritor em **Pedidos**; contabilização de receitas |

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `id` | serial | PK | |
| `name` | varchar | sim | |
| `last_name` | varchar | não | OSS; histórico `lastname` |
| `email` | varchar | não | |
| `phone` | varchar | não | |
| `cpf` | varchar | não | |
| `state` / `city` | varchar | não | |
| `type` | varchar | sim | Especialidade — ver enum |
| `specialty` | varchar | não | Texto livre complementar |
| `services_description` | varchar | não | Histórico `services` |
| `active` | int/bool | sim | Default 1 |
| `is_prescriber` | bool | não | Prescritor (receitas / pedidos) |
| `is_collaborator` | bool | não | Colaborador — **mostrar no input de Serviços** |
| `consultation_price` | numeric | **novo** | Valor padrão de consulta (colaboradores) |
| `calendar_id` | varchar | não | Calendário **secundário** Google deste profissional |
| `professional_code` | uuid | não | Relatórios / deep links |
| `donation_balance` | numeric | não | Já existe API de patch |
| `met_us` | varchar | não | |
| `date_created` | timestamptz | | |

**Tipos de flag no schema:** preferir `boolean` no OSS. Aceitar `'Sim'`/`'Não'` na leitura durante migração. Seed e writes novos usam `true`/`false`.

Filtros da página Profissionais: `Todos` | `Colaboradores` | `Prescritores` | `Ambos`.

### Exclusão

**Hard delete bloqueado** se houver serviços com `professional_id` (ou pedidos com `prescriber_code` se for prescritor).

**Soft-delete** (`active = 0`) permanece como forma de tirar o profissional do Autocomplete de Serviços sem apagar histórico.

Hard delete só se **nenhum** serviço e **nenhum** pedido vinculado.

### `type` — especialidade da consulta

Valores canônicos OSS (labels PT):

| Valor | Label |
|---|---|
| `medic` | Médico |
| `psychiatrist` | Psiquiatra |
| `psico` | Psicólogo |
| `therapist` | Terapeuta |
| `assist_social` | Assistente Social |
| `physiotherapist` | Fisioterapeuta |
| `dentist` | Dentista |
| `vet` | Veterinário |

UI de create/edit: select obrigatório. Um profissional = **um** tipo principal (em versões anteriores).

### Defaults de preço (create do serviço)

Ordem de resolução (ver também [`../relatorios-servicos/fields.md`](../relatorios-servicos/fields.md)):

1. Se o tipo no catálogo admin (`services.professional_types`) tiver `default_consultation_price != null` → **usar esse valor** (anula o preço do profissional)
2. Senão → `professional.consultation_price`
3. Senão → `0`

Seed OSS: tipos canônicos com `default_consultation_price: null` e `association_fee: 0` (sem hardcode 240/110 no produto). Instâncias (ex. Sou Cannabis) configuram no admin.

Taxa da associação (`association_fee`) **não** altera o `price` gravado no serviço — só o **valor a receber** no [relatório de serviços](../relatorios-servicos/README.md).

### Visibilidade no input de Serviços

```js
professionals
  .filter((p) => p.active && isCollaboratorTrue(p.is_collaborator))
  .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
```

`isCollaboratorTrue`: aceita `true`, `1`, `'Sim'` (migração legada).

`is_prescriber` **não** controla o input de Serviços (só loja/prescrição).

### Agenda (calendário principal vs secundário)

```
Conta Google da associação (OAuth)
  ├── Calendário PRINCIPAL (associação)
  │     → modules.google_calendar.primary_calendar_id
  │     → “agrupa” / é a agenda-mãe da associação; referência admin
  └── Calendários SECUNDÁRIOS (um por profissional colaborador)
        → professionals.calendar_id
        → eventos de consulta são criados AQUI
```

Fluxo operacional da associação:

1. Autoriza a conta Google e cria/escolhe o **calendário principal** pertencente à associação.
2. Para cada profissional colaborador necessário, cria (no Google) um **calendário secundário** e compartilha com a conta OAuth, ou usa um já listado.
3. No cadastro do profissional, seleciona esse secundário → grava `calendar_id`.
4. Agendamento de serviço usa **somente** `professionals.calendar_id`, nunca o principal.

`primary_calendar_id` no admin: select obrigatório após OAuth; documenta qual agenda é a da associação; UI de profissional pode filtrar/ocultar o principal da lista de secundários (ou permitir mas com label “Principal — não use para profissional”).

---

## 3. Configs (`system_configs`, `system=modules`)

| Key | Default | Uso |
|---|---|---|
| `modules.google_calendar.enabled` | `false` | Liga o módulo |
| `modules.google_calendar.primary_calendar_id` | `null` | Calendário principal da aplicação (select no admin) |
| `modules.google_calendar.use_for_scheduling` | `true` | Permite create/update/delete de eventos a partir de Serviços |

Admin: `modules.google_calendar.enabled`.

---

## 4. Credenciais (`system_api_credentials`, `service=google_calendar`)

| field_key | secret | env_fallback |
|---|---|---|
| `client_id` | sim | `GOOGLE_CLIENT_ID` |
| `client_secret` | sim | `GOOGLE_CLIENT_SECRET` |
| `redirect_uri` | não | `GOOGLE_REDIRECT_URI` |
| `refresh_token` | sim | `GOOGLE_REFRESH_TOKEN` |
| `access_token` | sim | — (preenchido pelo OAuth / refresh) |

Detalhe: [`../../api/modules/credentials.md`](../../api/modules/credentials.md) + [`../../api/modules/google_calendar.md`](../../api/modules/google_calendar.md).

---

## 5. Template de observações (modal Info)

Gerado no open do modal  quando há grupo. Se o serviço tem `patient_user_code`, separar blocos **Responsável** e **Paciente**; senão um único bloco do associado.

```
Responsável: {nome do associate}
CPF: …
Telefone: …
E-mail: …
Nascimento: …

Paciente: {patient_name}          ← só se patient_user_code
CPF: …
Telefone: …
Nascimento: …

Profissionais responsáveis:
- {tipo label}: {nome} — {data formatada}
- …

Endereço: …

Observações para o atendimento:
{texto livre / tags}
```

Tipos no texto: mapear `type` → label (`Médico`, `Psicólogo`, …).

Não ler `users.patient_user_code` do responsável para montar o template — usar só os campos do **serviço**.
