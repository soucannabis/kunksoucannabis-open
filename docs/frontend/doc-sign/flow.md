# Doc-sign — Fluxo

> Ciclo: modelo JSON (editor) → PDF → contrato preenchido → assinatura → audit → avanço do cadastro.

## Atores

| Ator | Onde | Papel |
|---|---|---|
| **Operador (gestão de termos)** | `apps/doc-sign` `/modelos` | Escreve os 2 modelos no TipTap; publica |
| **Associado (responsável)** | `cad.` fase 4 → redirect `termos.` | Vê PDF e assina |
| **Operador acolhimento** | `apps/kunk` Associados | Gera termo / copia link |
| **kunk-api** | server | Resolve variáveis, JSON→PDF, eventos, fase |

Editor **só** no `doc-sign` (não no admin).

---

## 1. Modelos (apenas dois)

| `kind` | Quando usa | Diferença |
|---|---|---|
| `self` | `himself` \| `pet` | Sem cláusula de paciente |
| `with_patient` | `another` + paciente | Trecho com `patient_full_name` + `patient_cpf` |

Sem seed de texto legal. Até publicar os 2 kinds → `TEMPLATE_NOT_PUBLISHED`.

```
another + paciente → with_patient
senão (himself | pet | …) → self
```

---

## 2. Edição (JSON → PDF)

```
Operador abre /modelos/:kind
     │  TipTap: texto do zero + picker de variáveis / signature
     │  salva content_json (JSONB)
     ▼
Publicar
     │  1. Grava term_template_versions (content_json + hash)
     │  2. kunk-api renderiza PDF do JSON (pdfmake/PDFKit)
     │  3. Marca versão current
     ▼
Pronto para contratos
```

Alterar modelo não mexe em contratos já emitidos.

---

## 3. Geração do contrato

| Situação | Pode gerar? |
|---|---|
| Nenhum contrato | Sim |
| Só pending/void | Sim (cadastro reutiliza pending; painel pode void+novo) |
| Já `completed` (user/e-mail) | Só com `replace_completed: true` (staff anula o vigante e cria novo) |

```
POST /doc-sign/contracts
     │  carrega users (+ paciente)
     │  clona content_json da versão current
     │  resolve nós variable → valores
     │  renderiza PDF preenchido (área signature vazia)
     │  term_contracts pending + events
     └─ signing_url
```

---

## 4. Assinatura (redirect)

```
cad. → redirect termos./assinar/:token
     │  form.viewed (IP, UA, timezone)
     │  draw | type | upload
     │  PDF assinado + audit (sem session_id)
     │  adhesion_term = contract.id; status 4→5
     └─ redirect cad./consulta
```

Sem webhook.

---

## 5. Audit

Hashes filled/signed; IP; UA; timezone; event log. 
Sem Session ID. Eventos: `contract.created`, `email.sent`, `form.viewed`, `submission.started`, `submission.completed`.

---

## 6–7. Cadastro e painel

Iguais à decisão anterior: redirect fase 4; Novo Termo só sem `completed`.

---

## 8. Diagrama

```
[TipTap] content_json ──► publish ──► PDF modelo
                              │
[Cadastro/Painel] ────────────┼──► PDF preenchido (se sem completed)
                              │
[Associado] assina ───────────┴──► PDF assinado + audit
                              │
                    adhesion_term (UUID) + fase 5
```
