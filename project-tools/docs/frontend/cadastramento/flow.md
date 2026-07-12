# Cadastramento — Fluxo e status

> Funil de inscrição, **fases numéricas** (`associate_status`) e tipo de registro (`status`).
> Todo cadastro é feito por um **responsável** (si mesmo, outra pessoa ou pet).

## Conceitos (dois campos distintos)

| Campo | Papel |
|---|---|
| **`associate_status`** (inteiro **1–5**) | **Fase do funil** do responsável. Flag para router, guards (não voltar) e animação do menu/sidebar. |
| **`status`** (string) | **Tipo / conclusão do registro.** `Associado` = responsável que concluiu o cadastro. `patient` = registro do paciente (quando há responsável por outra pessoa). |
| **`invalid_fields`** (JSON/texto) | Lista dos campos que **não passaram** na validação no último submit (suporte / contato). **Não** é fase do funil. |

Não usar mais strings de progresso (`email_created`, `form_error`, `associate_data`, …) como fonte de verdade.  
Fase **4** (assinatura): nesta entrega o **módulo de termos está em desenvolvimento** — ver [gaps.md](./gaps.md).

---

## Fases (`associate_status`)

| Fase | Significado | Rota | Menu (sidebar) |
|---:|---|---|---|
| **1** | Cadastro criado com e-mail | `/bem-vindo` → `/cadastro-associado` | Cadastro (atual) |
| **2** | Preenchendo / preenchidos dados pessoais (+ paciente se `another`) | `/cadastro-associado` e, se preciso, `/cadastro-paciente` | Cadastro |
| **3** | Envio de documentos de identidade (assistente) | `/documentos` | Documentos |
| **4** | Assinatura do termo | `/documentos` — **módulo em desenvolvimento** | Documentos |
| **5** | Docs extras (receita, laudos, exames) **e** escolha de finalização | `/consulta` → `/cadastro-concluido` | Consulta → Concluído |

Ao **finalizar** na fase 5 (qualquer opção válida: com receita, sem receita, etc.):

- responsável: `status = "Associado"` (permanece em fase 5 concluída ou marca-se como finalizado — ver guards)
- se existir paciente vinculado: o registro filho continua `status = "patient"`

### Guards (não voltar)

Quando o usuário **avança** de fase, o router **não** permite reabrir etapas anteriores:

| `associate_status` | Pode acessar | Bloqueado (redirect) |
|---:|---|---|
| 1 | welcome, form associado | docs, consulta, concluído |
| 2 | form associado / paciente (até completar) | docs, consulta… |
| 3 | `/documentos` (uploads) | forms de dados, consulta |
| 4 | assinatura do termo | uploads já concluídos / forms |
| 5 | `/consulta` e, após fim, `/cadastro-concluido` | docs e forms anteriores |

`/` (home) sempre redireciona para a rota da fase atual.

---

## Diagrama (happy path)

```
[/cadastro]  e-mail
     │  associate_status = 1
     ▼
[/bem-vindo] → [/cadastro-associado]
     │  dados pessoais (+ senha + CIAP2)
     │  persistência parcial + invalid_fields
     │  quando form completo e válido → associate_status = 2
     │
     ├── responsible_type = "another"
     │         [/cadastro-paciente]  (ainda fase 2)
     │         cria/atualiza registro filho status="patient"
     │         liga patient_user_code no responsável
     │         form paciente completo → segue para fase 3
     │
     └── himself | pet → fase 3
                                              ▼
[/documentos]  associate_status = 3
     │  assistente de documentos (RG ou CNH; ver § Documentos)
     │  se another: docs do responsável E do paciente
     │  quando TODOS os docs obrigatórios OK:
     │       associate_status = 4
     │       tela: módulo de assinatura de termos EM DESENVOLVIMENTO
     │       (assinatura real = entrega futura do módulo termos)
     │  quando módulo termos existir: assina → associate_status = 5
     │       grava adhesion_term
                                              ▼
[/consulta]  associate_status = 5
     │  receita / laudos / exames (opcional conforme opção)
     │  escolher finalização
                                              ▼
[/cadastro-concluido]
     status = "Associado"  (responsável)
```

---

## Rotas alvo

| Rota | Página | Auth |
|---|---|---|
| `/cadastro` | E-mail inicial | pública |
| `/login` | Login associado | pública |
| `/bem-vindo` | Boas-vindas | sessão |
| `/cadastro-associado` | Form responsável | sessão · fase 1–2 |
| `/cadastro-paciente` | Form paciente | sessão · fase 2 · só `another` |
| `/documentos` | Assistente de docs + termo | sessão · fase 3–4 |
| `/consulta` | Extras + finalizar | sessão · fase 5 |
| `/cadastro-concluido` | Encerramento | sessão · após Associado |
| `/nova-senha` | Redefinir senha | pública (token) |
| `/` | Router por `associate_status` | sessão |

Não recriar: `/iniciar-cadastro`, `/loja`, `/seu-cadastro`, `/cadastro-aprovado`.

---

## Responsável vs paciente (esclarecimento)

**Todo cadastro é feito por um responsável** (`responsible_type`: `himself` | `another` | `pet`).

| Situação | Registros | `status` |
|---|---|---|
| Cadastro para si (`himself`) ou pet | 1 usuário (o responsável) | ao fim: `Associado` |
| Cadastro para outra pessoa (`another`) | 2 usuários: responsável + paciente | responsável → `Associado`; filho → `patient` |

O progresso **`associate_status` 1–5** roda no **responsável** (quem tem login/senha e percorre o funil).

O registro **paciente** não tem funil próprio: é criado/atualizado na **fase 2**, recebe docs na **fase 3**, e permanece `status = "patient"`.

> **Nota:** a ideia antiga de um progresso string `patient_data` no responsável foi **descartada**. Fase 2 cobre dados do responsável e, se `another`, os do paciente.

---

## `invalid_fields` (ex-`form_error` / `form_error_log`)

Campo no banco (rename de `form_error_log` → **`invalid_fields`**) que guarda os inputs que **não passaram** na validação no último envio.

### Objetivo

- Identificar o que falta para o cadastro avançar.
- Permitir suporte / contato com o usuário sobre campos pendentes.
- **Não** altera a fase sozinho: o usuário permanece na fase 2 até o form estar completo.

### Regras

1. Em todo submit (associado ou paciente): validar todos os campos.
2. Persistir **somente** campos válidos (persistência parcial).
3. Campos inválidos/vazios obrigatórios → **não** gravar valor; incluir o nome do campo em `invalid_fields`.
4. Se um campo que estava em `invalid_fields` passar a validar → gravar o valor e **remover** esse campo de `invalid_fields`.
5. Form **completo** (lista `invalid_fields` vazia + todos obrigatórios OK) → avança a fase (ex.: permanece/avança em fase 2 e libera ida à fase 3 quando paciente também OK).

---

## Persistência parcial

Igual à regra de produto já acordada: cada submit grava só o que passou na validação. Detalhe de API em [api.md](./api.md).

---

## Documentos — assistente (fase 3)  **NOVO vs legado**

Substituir o upload genérico “RG” por um **assistente** que guia o envio.

### Tipo de documento (por pessoa)

| Tipo | Arquivos exigidos |
|---|---|
| **RG** | Frente **e** verso |
| **Carteira de motorista (CNH)** | Apenas **frente** |

O usuário **seleciona o tipo** antes de enviar.

### Quem precisa enviar

| `responsible_type` | Documentos |
|---|---|
| `himself` / `pet` | Identidade do responsável (RG ou CNH conforme escolha) |
| `another` | Identidade do **responsável** + identidade do **paciente** (cada um com seu tipo RG/CNH) |

### Geração do termo

- **Só após todos os documentos obrigatórios** do caso estarem enviados e válidos → `associate_status = 4`.
- **Nesta entrega:** a fase 4 exibe que o **módulo de assinatura de termos está em desenvolvimento** (sem DocuSeal/nativo). Não avança sozinho para a fase 5.
- Quando o módulo termos for entregue: gerar contrato, usuário assina, webhook/API → fase 5 + `adhesion_term`. Identificador no termo: **`user_code`**.

### `awaiting_signature`

Reservado ao módulo nativo de termos (futuro). Não usar nesta entrega.

### Campos de arquivo (evolução)

O legado usava `rg_proof` / `rg_patient_proof` (um arquivo). No OSS o assistente precisa modelar **frente/verso** e tipo:

Proposta (detalhar na API/files na implementação):

- metadados por upload: `doc_type` (`rg` \| `cnh`), `side` (`front` \| `back`), `subject` (`responsible` \| `patient`)
- ou campos dedicados / `users_files` com tags

`proof_of_address` continua **fora** do OSS.

---

## Fase 5 — consulta / extras / finalizar

| Ação | Efeito |
|---|---|
| Enviar receita | grava `prescription` (ex-`medical_prescription`) |
| Enviar laudo / exame | arquivos extras (assistente ou anexos tipados) |
| Agendar consulta | abre `VITE_CONTACT_URL` |
| Concluir (com ou sem receita) | `status = "Associado"` → `/cadastro-concluido` |

Único status de encerramento do responsável: **`Associado`**. Não usar `aguardando-aprovacao`.

---

## Router de `/`

| `associate_status` | Destino |
|---:|---|
| 1 | `/bem-vindo` |
| 2 | `/cadastro-associado`; se `another` e paciente incompleto → `/cadastro-paciente` |
| 3 | `/documentos` (uploads) |
| 4 | `/documentos` — UI “módulo de termos em desenvolvimento” |
| 5 | `/consulta`; se já `status=Associado` → `/cadastro-concluido` |

---

## Mapa legado → OSS

| Legado `associate_status` | OSS `associate_status` | Notas |
|---:|---:|---|
| 0 (+ form ok parcial) | 1 ou 2 | 1 = só e-mail; 2 = em dados |
| 1, 2 | 2 | form |
| 3 | 3 | docs |
| 4 | 4 → 5 | assinado → consulta |
| 5, 6, 7 | 5 + `status=Associado` | finalizado |
| 9 | (registro filho) | `status=patient` |

| Legado `status` string | OSS |
|---|---|
| `signup` | fase 1 |
| `registered` / `formerror` | fase 2 + `invalid_fields` |
| `proofs` | fase 3 |
| `signedcontract` | fase 4→5 |
| `prescription` | fase 5 + arquivo `prescription` |
| `aguardando-aprovacao` / `Associado` | `Associado` |
| `patient` | `patient` |

| Legado campo | OSS |
|---|---|
| `log` / `form_error_log` | `invalid_fields` |
| `medical_prescription` | `prescription` |
| `contract` | `adhesion_term` |

---

## Sidebar de progresso (UX)

Etapas visuais: **Cadastro → Documentos → Consulta → Concluído** (como o legado).

| Etapa UI | Ativa / check quando |
|---|---|
| Cadastro | fase 1–2 (check a partir da 3) |
| Documentos | fase 3–4 (check a partir da 5) |
| Consulta | fase 5 |
| Concluído | `status = Associado` |

Animação/estados (check, atual, bloqueado) seguem `associate_status`, como no cadastramento atual.

---

## Legado não portado

- `bvid` / BeeViral, `met_us`, `proof_of_address`, `aguardando-aprovacao`
- Geração de termo antes de completar todos os docs (quando `another`)

Ver [gaps.md](./gaps.md) e [fields.md](./fields.md).
