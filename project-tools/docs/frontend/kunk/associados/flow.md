# Associados — Fluxos

## Atores e acesso

| Camada | Comportamento |
|---|---|
| **Admin → páginas por role** | Configurável (`kunk.role_pages`) |
| **Default** | Todas as roles staff (`Administrador`, `Acolhimento`, `Produção`, …) |
| **Roles típicas** | Acolhimento e Administrador usam esta página no dia a dia |

Roles staff entram no app Kunk; menu/rotas filtram por `role_pages`.

---

## 1. Listagem (cadastramento)

```
Abrir /app/acolhimento/cadastramento
  → GET últimos N responsáveis (default N=60; “Carregar mais” aumenta)
  → excluir status=patient da lista principal
  → cards de contagem por fase/status do funil
  → tabela: avatar · nome · e-mail · telefone · status · criado
  → pesquisa local na tabela (nome, e-mail, telefone, paciente vinculado)
```

### Deep link do search / atalhos

```
?a={user_code}
  → carrega só esse user (+ pacientes via responsible_code)
  → abre modal do associado
```

### Criar associado (painel)

```
Botão "Criar Associado"
  → modal com e-mail (mínimo)
  → POST cria users (associate_status=1, status conforme regra do funil)
  → associado aparece na lista / pode abrir modal
```

Espelha o legado `createAssociate.jsx` (só e-mail no painel). O funil completo continua no app `registration`.

### Enviar para triagem

Na linha (ou no search), se status concluído (`Associado`):

```
Ação "Enviar para triagem"
  → POST reception com dados do associado
  → redirect /app/acolhimento/triagem (ou abre fila)
```

---

## 2. Modal do associado

```
Abrir modal (avatar / clique / ?a=)
  Header: avatar · nome · "Associado desde …"
         · [Tornar associado] (se ainda em funil)
         · menu Termo (Novo Termo / Copiar link) — stubs nulos
  Abas:
    0 Dados Pessoais
    1 Pacientes
    2 Prescritor
    3 Anotações
    4 Documentos
    5 Histórico
```

### 2.1 Dados pessoais

- Form editável (nome, CPF, RG, nascimento, gênero, nacionalidade, estado civil, tel, e-mail, endereço, motivo texto)
- CIAP2 (`ciap_codes` + texto)
- Salvar → PATCH user
- Excluir → só se **sem** pedidos, serviços nem pacientes vinculados (**409** caso contrário; ver [gaps.md](./gaps.md))

### 2.1b Tornar associado

Botão no header (se ainda não for `Associado`):

```
Confirmar
  → status = "Associado"
  → associate_status = 5
  → sem gerar termo / sem adhesion_term
```

### 2.2 Pacientes

```
Lista pacientes WHERE responsible_code = associado.user_code
  · accordion por paciente
  · editar dados + CIAP
  · excluir paciente (bloquear se serviços com patient_user_code)
  · criar paciente (CreatePatient)

SEM botões "Tornar Ativo" / "Remover Ativo"
```

**Mudança vs legado:** não há mais “paciente ativo” operacional no painel. O vínculo estrutural é `responsible_code` no paciente.

`users.patient_user_code` no **responsável** continua sendo preenchido pelo **funil** (`responsible_type=another`) — aponta o paciente cadastrado no funil. Uso no painel:

| Uso | Comportamento |
|---|---|
| Lista / subtítulo | Pode exibir o nome desse paciente se o código for válido |
| Serviços (`?u=` / create) | **Pré-selecionar** esse paciente como beneficiário se existir e for filho do responsável |
| Template do serviço | Usa só `services.patient_user_code` gravado no atendimento |

### 2.3 Prescritor

- Campo **texto livre** `prescriber` (nome)
- `prescriber_code` opcional (se operador colar/vincular código)
- Data da receita (`date_prescription`)
- Upload de receita via `FileUpload` com `kind="prescription"`
- **Sem** autocomplete obrigatório de `professionals`; **sem** Parceiro

### 2.4 Anotações

```
Campo users.annotations = JSON array
  item: { id, text, date_created, userName, user_code? }
  · adicionar → PATCH imediato
  · excluir → PATCH imediato
Autor = system_user logado (nome exibido)
```

Anotações são da **equipe de acolhimento** sobre o associado — não são mensagens do associado.

### 2.5 Documentos

Reutilizar `apps/kunk/src/components/files/FileUpload.jsx` + `documentKinds.js`:

1. Selecionar tipo (Documento do Associado / paciente / Receita / Laudo / Exame)
2. Escolher arquivo → renomeia `{prefix}{nome}-{sobrenome}-{user_code}.{ext}`
3. Upload → `files` + `users_files` (`doc_kind`, `subject`, …)

Mesma lógica do uploader já implementado no Kunk.

### 2.6 Histórico

```
GET pedidos do user_code
GET serviços do user_code (associate_user_code)
  → lista unificada ou duas seções, mais recente primeiro
```

Colunas no espírito do legado (`associateHistory.jsx`).

### 2.7 Termo de adesão

```
UI (igual legado no header):
  · "Novo Termo"
  · "Copiar link do Termo" (se adhesion_term existir)

Painel v1 (stub):
  · Qualquer ação → no-op / "Módulo de termos em desenvolvimento"
  · NÃO grava adhesion_term; NÃO muda status

Ciclo real (app de assinatura de termos — entrega futura):
  1. Gerar termo → status/label "Termo não assinado"
  2. Assinar → status atualizado pelo app de termos
```

---

## 3. Serviços — seleção do beneficiário

O legado usava `responsible_for` (OSS: `patient_user_code` no responsável) para montar observações/agenda como Responsável + Paciente.

**Novo fluxo:**

```
Modal Novo Serviço
  1. Buscar / selecionar associado responsável
  2. Selecionar beneficiário do atendimento:
       ○ O próprio associado responsável
       ○ Paciente X (lista GET /users/:id/patients)
     Default: se responsável.patient_user_code válido → pré-seleciona esse paciente
  3. Profissionais, valores, data, tags… (como hoje)
  4. Criar
```

Persistência no serviço:

| Campo | Quando beneficiário = responsável | Quando = paciente |
|---|---|---|
| `associate_user_code` / name / email | responsável | responsável (sempre) |
| `patient_user_code` | `null` | `user_code` do paciente |
| `patient_name` | `null` ou nome do responsável (opcional) | nome do paciente |

Observações / evento de calendário / templates usam **dados do paciente escolhido + dados do responsável** quando há paciente; senão só o responsável.

Ver atualização em [`../servicos/flow.md`](../servicos/flow.md) (seção beneficiário) e [fields.md](./fields.md).

---

## 4. Search global → associados

Ver [`../search-global/flow.md`](../search-global/flow.md).

Resumo: resultado associado abre `/app/acolhimento/cadastramento?a={code}` (nova aba, como legado) e oferece ação **Triagem**.

---

## 5. Status / fases na lista

Mapear para labels de UI (cards + filtros + coluna Status). Fonte de verdade OSS:

| Condição | Label UI sugerido |
|---|---|
| `status = Associado` | Associado |
| `status = patient` | (não lista como responsável) |
| `associate_status = 1` | Não preencheu / e-mail criado |
| `associate_status = 2` | Preenchendo / preencheu dados |
| `associate_status = 3` | Documentos |
| `associate_status = 4` | Termo (aguardando assinatura — quando módulo existir: “Termo não assinado”) |
| `status` / label pós-gerar termo (módulo futuro) | Termo não assinado |
| Após assinatura (módulo futuro) | Atualizado pelo app de termos → tipicamente Associado |
| `associate_status = 5` + não Associado | Fase final / docs extras |
| `invalid_fields` não vazio | Destacar / filtro “erro de formulário” |

Compatibilidade de leitura com strings legadas migradas (`published`, `registered`, `proofs`, `signedcontract`, …) via mapa no server ou na UI — ver [fields.md](./fields.md).
