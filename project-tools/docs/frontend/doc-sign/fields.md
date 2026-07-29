# Doc-sign — Campos, variáveis e schema

> Variáveis de preenchimento alinhadas ao **schema alvo** (`users`), não aos nomes do DocuSeal.
> Fonte canônica dos campos: [`../cadastramento/fields.md`](../cadastramento/fields.md) + `target-schema.sql`.

## 1. Variáveis do termo

No editor TipTap, o operador insere variáveis via picker (nó `variable` com `attrs.name`).  
Na renderização PDF / preview, o nó vira o valor resolvido.  
Os nomes abaixo são os de `attrs.name`; a origem é sempre coluna de `users`.

| Variável (`{{…}}`) | Label (audit / UI) | Coluna `users` | Observação |
|---|---|---|---|
| `responsible_full_name` | Nome do Responsável | `associate_name` + `associate_last_name` | Concatenar com espaço; trim |
| `patient_full_name` | Nome do Paciente | paciente: `associate_name` + `associate_last_name` | Só `with_patient` |
| `responsible_cpf` | CPF Responsável | responsável: `associate_cpf` | |
| `patient_cpf` | CPF Paciente | paciente: `associate_cpf` | Só `with_patient` |
| `responsible_rg` | RG | responsável: `associate_rg` | Só responsável |
| `associate_rg_issuer` | Emissor do RG | responsável: `associate_rg_issuer` | |
| `nationality` | Nacionalidade | responsável: `nationality` | |
| `marital_status` | Estado Civil | responsável: `marital_status` | |
| `email` | Email | responsável: `email_account` | |
| `street` | Rua | responsável: `street` | |
| `street_number` | Numero | responsável: `street_number` | |
| `city` | Cidade | responsável: `city` | Também no fecho do termo |
| `neighborhood` | Bairro | responsável: `neighborhood` | |
| `state` | Estado | responsável: `state` | |
| `cep` | CEP | responsável: `cep` | Campo do schema (não existe `street_code`) |
| `current_date` | Data atual | gerada no server na criação do contrato | PT-BR longo no corpo |
| `signature` | Assinatura | preenchida na assinatura | Placeholder assinável |
| `user_code` | USERCODE | responsável: `user_code` | UUID |

> **CEP:** o schema alvo usa `cep`. Não há coluna `street_code` / `street-code`. A variável do termo é `{{cep}}`.

### Trecho condicional (`with_patient`)

No final do primeiro parágrafo do modelo `with_patient`:

> … responsável pelo tratamento de **{{patient_full_name}}** CPF **{{patient_cpf}}**.

`patient_cpf` ← `associate_cpf` do registro paciente (`status=patient`).

No modelo `self` esse trecho **não existe** (dois documentos distintos).

### Cidade e data no fecho

O rodapé (“cidade, data”) usa `{{city}}` e `{{current_date}}`.

---

## 2. Resolução na geração do contrato

```
responsável = users onde user_code = alvo
paciente    = users onde user_code = responsável.patient_user_code
              (somente se responsible_type = 'another')

kind = with_patient se (another + paciente existe) senão self
       (himself e pet → self)
```

---

## 3. Tabelas novas (PostgreSQL)

### `term_templates`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `kind` | TEXT NOT NULL | `self` \| `with_patient` |
| `title` | TEXT | |
| `current_version_id` | UUID NULL FK → versions | versão publicada |
| `created_at` / `updated_at` | timestamptz | |

### `term_template_versions`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `template_id` | UUID FK | |
| `version_number` | INT | monotônico por template |
| `content_json` | JSONB NOT NULL | documento TipTap/ProseMirror (fonte de verdade) |
| `content_sha256` | TEXT | hash canônico do JSON |
| `pdf_file_id` | UUID NULL FK → files | snapshot PDF do modelo (publish) |
| `pdf_sha256` | TEXT NULL | |
| `created_by` | UUID NULL | operador |
| `created_at` | timestamptz | |
| `notes` | TEXT NULL | |

Formato de `content_json`: documento do editor (ex. TipTap). Variáveis e assinatura são nós/marcas tipados (`variable`, `signature`), não texto solto opaco — facilita validar placeholders e renderizar PDF.

### `term_contracts`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | Envelope ID no audit |
| `user_code` | UUID FK → users.user_code | responsável / signatário |
| `signer_email` | TEXT | denormalizado de `email_account` (unicidade completed) |
| `template_version_id` | UUID FK | imutável após create |
| `kind` | TEXT | |
| `status` | TEXT | `pending` \| `completed` \| `void` |
| `variables` | JSONB | snapshot dos valores |
| `filled_pdf_file_id` | UUID FK | |
| `signed_pdf_file_id` | UUID NULL FK | |
| `audit_pdf_file_id` | UUID NULL FK | |
| `filled_pdf_sha256` | TEXT | Original no audit |
| `signed_pdf_sha256` | TEXT NULL | Result no audit |
| `signing_token_hash` | TEXT | |
| `signing_token_expires` | timestamptz NULL | |
| `created_at` / `completed_at` | timestamptz | |

**Índice único parcial:** no máximo **um** contrato `completed` por `signer_email` (e/ou por `user_code`).

### `term_signatures`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `contract_id` | UUID FK | |
| `method` | TEXT | `draw` \| `type` \| `upload` |
| `typed_name` | TEXT NULL | |
| `image_file_id` | UUID NULL FK | |
| `consent_accepted_at` | timestamptz | |
| `created_at` | timestamptz | |

### `term_events`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `contract_id` | UUID FK | |
| `event_type` | TEXT | ver flow.md |
| `occurred_at` | timestamptz | |
| `actor_email` | TEXT NULL | |
| `actor_name` | TEXT NULL | |
| `ip` | TEXT NULL | |
| `user_agent` | TEXT NULL | |
| `timezone` | TEXT NULL | |
| `meta` | JSONB NULL | |

**Sem `session_id`** no audit (assinatura por token público não tem sessão confiável equivalente ao DocuSeal).

Índices: `(contract_id, occurred_at)`, `(user_code)` em contracts.

---

## 4. Campo em `users`

| Campo | Uso |
|---|---|
| `adhesion_term` | **UUID** FK lógica → `term_contracts.id` (migration: `TEXT` → `UUID`) |
| `associate_status` | 4 → 5 na conclusão |
| `user_code` | Identificador no contrato / audit |

---

## 5. Arquivos (`files`)

O modelo editável **não** mora em `files` — mora em `content_json`. PDFs e assinatura sim:

| purpose | Descrição |
|---|---|
| `term_template_pdf` | Snapshot PDF do modelo (publish) |
| `term_filled_pdf` | Contrato preenchido |
| `term_signed_pdf` | Contrato assinado |
| `term_audit_pdf` | Audit log |
| `term_signature_image` | Imagem da assinatura |

---

## 6. Exemplo de `variables` (JSONB)

```json
{
  "responsible_full_name": "Paulo Luciano de Andrade",
  "patient_full_name": null,
  "responsible_cpf": "799.103.786-04",
  "patient_cpf": null,
  "responsible_rg": "5466472",
  "associate_rg_issuer": "PC",
  "nationality": "brasileiro(a)",
  "marital_status": "Casado",
  "email": "plandrade72@gmail.com",
  "street": "Noronha Guarani",
  "street_number": "180",
  "city": "Belo Horizonte",
  "neighborhood": "Santa Margarida (Barreiro)",
  "state": "MG",
  "cep": "30640-290",
  "current_date": "13 de Julho de 2026",
  "user_code": "a1b2c3d4-...."
}
```
