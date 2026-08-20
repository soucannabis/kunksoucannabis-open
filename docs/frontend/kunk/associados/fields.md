# Associados — Campos

## 1. `users` (responsável e paciente)

Mesma tabela. Distinção por `status` / `responsible_code`.

### Identidade e contato

| Campo OSS | Tipo | Notas | Histórico |
|---|---|---|---|
| `id` | serial | PK | |
| `user_code` | uuid | Público, UNIQUE | `user_code` |
| `fullname` | varchar | Nome completo (busca) | `fullname` |
| `associate_name` | varchar | Nome | `name_associate` |
| `associate_last_name` | varchar | Sobrenome | `lastname_associate` |
| `email_account` | varchar | Login / contato | `email_account` |
| `mobile_number` | varchar | Telefone | |
| `associate_cpf` | varchar | CPF | `cpf_associate` |
| `associate_rg` | varchar | RG | `rg_associate` |
| `associate_rg_issuer` | varchar | Órgão | |
| `associate_birth_date` | varchar | Nascimento | `birthday_associate` |
| `gender` | varchar | | |
| `nationality` | varchar | | |
| `marital_status` | varchar | | |
| `avatar_url` | varchar | | |

### Endereço

| Campo | Notas |
|---|---|
| `street`, `street_number`, `complement`, `neighborhood`, `city`, `state`, `cep` | Form dados pessoais |
| `delivery_address` | JSONB (entrega) — se usado em pedidos |

### Funil e tipo

| Campo | Tipo | Notas |
|---|---|---|
| `associate_status` | int | Fases **1–5** do app de cadastramento |
| `status` | varchar | `Associado` · `patient` · (histórico migrado) |
| `invalid_fields` | text/json | Campos inválidos do funil |
| `created_date` / `date_created` | timestamp | Coluna “Criado” |

### Vínculo responsável ↔ paciente

| Campo | Onde | Papel |
|---|---|---|
| `responsible_code` | no **paciente** | FK → `users.user_code` do responsável |
| `responsible_type` | no responsável (funil) | `himself` · `another` · `pet` |
| `patient_user_code` | no responsável | Ponteiro do **funil** (`another`) → paciente cadastrado; **pré-seleciona** beneficiário em Serviços; **não** é flag “ativo” editável no painel |

Relação canônica para listar pacientes: `WHERE responsible_code = :associate_user_code`.

### Clínica / prescritor

| Campo | Notas |
|---|---|
| `reason_treatment_text` | Motivo (texto) |
| `ciap_codes` | CIAP2 (JSON/texto) |
| `prescriber` | Nome texto livre |
| `prescriber_code` | Código opcional (não obrigatório vincular a `professionals`) |
| `date_prescription` | Data da receita |
| `prescription` | Ref legada receita (preferir `users_files` doc_kind=prescription) |

### Anotações e termo

| Campo | Notas |
|---|---|
| `annotations` | JSON array — anotações da equipe (histórico `anotations`) |
| `adhesion_term` | Ref do termo — **vazio** até módulo termos (histórico `contract`) |
| `handbook` | Manual / observações livres se existir |

### Documentos (junction)

Preferir `users_files` + `files`. Campos histórico `rg_proof`, `rg_patient_proof`, `documents_folder_id` podem existir por migração; UI nova **não** depende deles.

---

## 2. Anotações — shape JSON

```json
[
  {
    "id": "uuid-ou-timestamp",
    "text": "Retornar contato amanhã",
    "date_created": "2026-07-12T15:00:00.000Z",
    "userName": "Maria Silva",
    "user_code": "uuid-do-system-user"
  }
]
```

Persistência: PATCH em `users.annotations` (string JSON ou JSONB conforme coluna).

---

## 3. `users_files` + tipos de documento

Ver `apps/kunk/src/lib/documentKinds.js`:

| key | Label UI | prefix | doc_kind | subject |
|---|---|---|---|---|
| `identity_responsible` | Documento do Associado | `doc-associado-` | `identity` | `responsible` |
| `identity_patient` | Documento do paciente | `doc-paciente-` | `identity` | `patient` |
| `prescription` | Receita | `receita-` | `prescription` | — |
| `report` | Laudo | `laudo-` | `report` | — |
| `exam` | Exame | `exame-` | `exam` | — |

Filename: `{prefix}{nome}-{sobrenome}-{user_code}.{ext}` (sem acentos/espaços).

---

## 4. `services` — beneficiário do atendimento

Campos existentes + ajuste:

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `associate_user_code` | uuid | sim | **Sempre** o responsável |
| `associate_name` / `associate_email` | snapshot | sim / não | Do responsável |
| `patient_user_code` | uuid | **novo** (nullable) | Paciente escolhido; `null` = atendimento ao responsável |
| `patient_name` | varchar | não | Snapshot do nome do paciente (ou vazio se só responsável) |

Observações / calendário: se `patient_user_code` preenchido, template inclui bloco Responsável + Paciente; senão só associado.

Migration: `ALTER TABLE services ADD COLUMN IF NOT EXISTS patient_user_code UUID;` (+ FK opcional para `users.user_code`).

---

## 6. Fora de escopo / não portar no modal

| Campo / UI histórico | Motivo |
|---|---|
| `partner` / PartnerForm | Sem aba Parceiro |
| `bvid` / Beeviral | SC |
| o módulo de termos `contract` payload | Stub |
| `responsible_for` ativo na UI | Substituído por seleção em Serviços |
