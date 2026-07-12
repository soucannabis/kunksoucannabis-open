# Cadastramento — Campos (legado → schema alvo)

> Mapa dos campos usados pelo fluxo de cadastro.
> Fonte de rename: [`../../directus/field-rename-map.json`](../../directus/field-rename-map.json).
> Schema SQL: [`../../../sql/target-schema.sql`](../../../sql/target-schema.sql).
> Fases e guards: [flow.md](./flow.md).

O app novo deve falar **somente** os nomes da coluna “Novo”.

## Legenda

| Símbolo | Significado |
|---|---|
| ✓ | Presente no schema alvo (`users`) |
| ✗ | Legado apenas — **não** portar |
| — | Não grava / só UI |

---

## Campos de controle (todos os passos)

| Papel | Legado | Novo | Notas |
|---|---|---|---|
| Fase do funil (responsável) | `associate_status` (0–9 opaco) | `associate_status` ✓ **1–5** | Ver [flow.md](./flow.md) |
| Tipo / conclusão | `status` (várias strings) | `status` ✓ | `Associado` \| `patient` (e valores transitórios só se necessário) |
| Campos que falharam validação | `log` / erros de form | **`invalid_fields`** ✓ | JSON lista de nomes de campo; ex-`form_error_log` |
| Ref. do termo | `contract` | `adhesion_term` ✓ | |
| Receita | `medical_prescription` | **`prescription`** ✓ | |

---

## 1. Conta inicial (`/cadastro`) — fase 1

| UI | Legado | Novo | Obrig. | Notas |
|---|---|---|---|---|
| E-mail | `email_account` | `email_account` ✓ | sim | |
| — | `associate_status` | `associate_status = 1` | — | |
| — | `bvid` | — ✗ | — | Não usar |

---

## 2. Responsável (`/cadastro-associado`) — fase 2

| UI | Legado | Novo | Obrig. |
|---|---|---|---|
| Tipo responsável | `responsable_type` | `responsible_type` ✓ | sim |
| Nome | `name_associate` | `associate_name` ✓ | sim |
| Sobrenome | `lastname_associate` | `associate_last_name` ✓ | sim |
| Nascimento | `birthday_associate` | `associate_birth_date` ✓ | sim |
| Gênero | `gender` | `gender` ✓ | sim |
| Nacionalidade | `nationality` | `nationality` ✓ | sim |
| CPF | `cpf_associate` | `associate_cpf` ✓ | sim |
| RG | `rg_associate` | `associate_rg` ✓ | sim |
| Órgão RG | `emiiter_rg_associate` | `associate_rg_issuer` ✓ | sim |
| Estado civil | `marital_status` | `marital_status` ✓ | sim |
| Senha | `pass_account` | `account_password` ✓ | sim |
| Celular | `mobile_number` | `mobile_number` ✓ | sim |
| Rua | `street` | `street` ✓ | sim |
| Número | `number` | `street_number` ✓ | sim |
| Complemento | `complement` | `complement` ✓ | não |
| Bairro | `neighborhood` | `neighborhood` ✓ | sim |
| Cidade | `city` | `city` ✓ | sim |
| UF | `state` | `state` ✓ | sim |
| CEP | `cep` | `cep` ✓ | sim |
| CIAP2 | `reason_treatment` | `ciap_codes` ✓ | sim |
| Motivo (texto) | `reason_treatment_text` | `reason_treatment_text` ✓ | sim |
| Como nos conheceu | `met_us` | — ✗ | — |
| — | `log` | `invalid_fields` ✓ | — | atualizado a cada submit |

Submit: persistência parcial + `invalid_fields` — [flow.md](./flow.md).  
Form completo (`invalid_fields` vazio) → segue na fase 2 (paciente se `another`) ou libera fase 3.

### Valores canônicos

**`responsible_type`:** `himself` | `another` | `pet` (no filho: `patient`)

**`marital_status`:** `Solteiro` | `Casado` | `União-Estável` | `Viúvo` | `Divorciado`

**`gender`:** `homem-cis` | `mulher-cis` | `homem-trans` | `mulher-trans` | `travesti` | `nao-binario` | texto livre (`outro`)

### CIAP2

| Aspecto | Comportamento |
|---|---|
| Campo | `ciap_codes` (legado: `reason_treatment`) |
| Texto | `reason_treatment_text` |
| UI | Multi-select por categorias + busca (legado `CIAP2Select`) |
| Limite | máx. **10**; mín. **1** para form completo |
| Persistência parcial | 1–10 → grava; vazio ou >10 → não grava + entra em `invalid_fields` |

Catálogo: portar de `cadastramento/src/components/forms/CIAP2Select.js`.

---

## 3. Paciente (`/cadastro-paciente`) — ainda fase 2 do responsável

Registro **filho** em `users`. O progresso 1–5 continua no **responsável**.

| Campo | Novo | Origem |
|---|---|---|
| `status` | `"patient"` | fixo |
| `responsible_type` | `"patient"` | fixo |
| `email_account` ou `email` | e-mail do responsável | alinhar na implementação ao schema (`email_account` preferível) |
| `mobile_number` | herdado | responsável |
| `responsible_code` | `user_code` do responsável | FK |
| demográficos + CIAP2 | formulário | iguais ao responsável (sem senha) |

No responsável: `patient_user_code` = `user_code` do paciente criado neste funil.

### Semântica canônica de `patient_user_code` (dois contextos)

| Contexto | Campo | Papel |
|---|---|---|
| **Funil** (`apps/registration`) | `users.patient_user_code` no **responsável** | Ponteiro do paciente cadastrado quando `responsible_type = another`. Liga o funil ao registro filho. **Não** significa “paciente ativo” editável no painel. |
| **Relação estrutural** | `users.responsible_code` no **paciente** | FK canônica paciente → responsável. Usar para listar/CRUD de pacientes. |
| **Atendimento** (painel Serviços) | `services.patient_user_code` | Beneficiário **daquele** serviço. Escolhido no modal Novo Serviço. Templates/calendário leem **só** este campo. |

Regras cruzadas (painel Kunk — ver [`../kunk/associados/`](../kunk/associados/README.md) e [`../kunk/servicos/`](../kunk/servicos/README.md)):

1. Painel **não** tem Tornar/Remover Ativo sobre `users.patient_user_code`.
2. Pacientes adicionados depois na aba Pacientes usam só `responsible_code`; **não** precisam atualizar `users.patient_user_code` (esse campo permanece o do funil, se houver).
3. Ao criar serviço com associado pré-carregado (`?u=`): se `users.patient_user_code` existir e o paciente tiver `responsible_code` = responsável → **pré-selecionar** esse paciente como beneficiário; o operador pode mudar.
4. Não migrar em massa o ponteiro do funil para serviços antigos.

Persistência parcial + `invalid_fields` no registro paciente (ou espelho no responsável — preferir no registro que está sendo editado).

---

## 4. Documentos (`/documentos`) — fases 3–4

### Assistente (novo)

| UI | Comportamento |
|---|---|
| Seleção de tipo | **RG** ou **Carteira de motorista (CNH)** |
| RG | upload **frente** + **verso** |
| CNH | upload só **frente** |
| `another` | assistente para **responsável** e para **paciente** |
| Termo | gera só quando **todos** os docs obrigatórios do caso estiverem OK → fase **4** |

Legado `rg_proof` / `rg_patient_proof` (arquivo único) → no OSS, arquivos com metadados (`doc_type`, `side`, `subject`) via `users_files` / files API — ver [flow.md](./flow.md) e [gaps.md](./gaps.md).

| Campo | Novo | Notas |
|---|---|---|
| Pasta | `documents_folder_id` | server-side |
| Termo | `adhesion_term` | após assinatura (webhook) |
| `proof_of_address` | — ✗ | Não usar |

Assinatura OK → `associate_status = 5`, grava `adhesion_term`.

---

## 5. Consulta (`/consulta`) — fase 5

| UI | Legado | Novo |
|---|---|---|
| Receita médica | `medical_prescription` | **`prescription`** ✓ |
| Laudo / exame | uploads na pasta | files API + tipo |
| Concluir | status variado | `status = "Associado"` |

---

## 6. Sessão (servidor)

`session_token`, `session_expires`, `is_session_active`, `last_activity` — só no server; cookie HttpOnly no browser.

---

## 7. Payload do termo (DocuSeal / futuro nativo)

| Campo template | Origem |
|---|---|
| `usercode` | preferir `user_code` (não `id`) |
| `email` | `email_account` |
| Nome | `associate_name` + `associate_last_name` |
| Estado civil, nacionalidade, CPF, RG, órgão, endereço | campos novos equivalentes |
| Data | por extenso PT |

---

## 8. Renames críticos

```
responsable_type      → responsible_type
name_associate        → associate_name
lastname_associate    → associate_last_name
cpf_associate         → associate_cpf
rg_associate          → associate_rg
emiiter_rg_associate  → associate_rg_issuer
number                → street_number
pass_account          → account_password
user_path             → documents_folder_id
reason_treatment      → ciap_codes
responsable_code      → responsible_code
birthday_associate    → associate_birth_date
log / form_error_log  → invalid_fields
responsible_for       → patient_user_code
contract              → adhesion_term
medical_prescription  → prescription
```

**Não portar:** `met_us`, `bvid`, `proof_of_address`, `aguardando-aprovacao`.

Progresso: **`associate_status` 1–5**. Conclusão do responsável: **`status = Associado`**. Filho: **`status = patient`**.

Nunca expor `account_password` em GET. Hash só no servidor.
