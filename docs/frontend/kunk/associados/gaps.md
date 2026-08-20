# Associados — Gaps e checklist

## Decisões fechadas

| # | Decisão |
|---|---|
| 1 | Layout/visual **igual aversões anteriores** (`dash` + `table` + `UserModal`) |
| 2 | Rota principal `/app/acolhimento/associados`; `/app/associados` = redirect opcional ou omitir na v1 |
| 3 | Deep link `?a={user_code}` abre o modal |
| 4 | Abas: Dados Pessoais · Pacientes · **Prescritor** · Anotações · Documentos · Histórico |
| 5 | **Sem** aba/form Parceiro |
| 6 | Termo no painel: UI presente; ações **nulas** até o app/módulo de assinatura |
| 7 | Documentos = `FileUpload` + `documentKinds` existentes |
| 8 | Anotações = JSON em `users.annotations` via **PATCH do array** (v1); autor = operador |
| 9 | Pacientes via `responsible_code`; **sem** Tornar/Remover Ativo no painel |
| 10 | `users.patient_user_code` no responsável = ponteiro do **funil** (`another`); **não** é “paciente ativo” operacional |
| 11 | Serviços: escolher beneficiário; gravar `patient_user_code` **no serviço** |
| 12 | Fases OSS `associate_status` 1–5 + `status` Associado/patient; mapa de compat histórico |
| 13 | Search global em spec separada |
| 14 | Sem Beeviral / Utalk / o módulo de termos no painel nesta entrega |
| 15 | **Tornar associado** manual no header do modal — mantido |
| 16 | Ciclo do termo (gerar → “não assinado” → assinado) = **app de assinatura de termos** (futuro) |
| 17 | **Exclusão com bloqueio por vínculo** (ver § Exclusão) |
| 18 | Aba Prescritor: **texto livre** (`prescriber` / `prescriber_code` opcional) |
| 19 | Novo Serviço + `?u=`: se `users.patient_user_code` do responsável existir e for paciente válido → **pré-selecionar** esse paciente como beneficiário |

## Defaults confirmados

| Tema | Decisão |
|---|---|
| Limite lista | 60 + carregar mais; lista “todos” = limite alto se houver atalho |
| Criar no painel | E-mail (mínimo), comversões anteriores |
| Stack UI | MUI + `pageContainerOptions` / `pageContainerTable` |
| Termo stub (painel) | Toast / 501; **zero** side effect até o módulo |
| Anotações API | PATCH `annotations` (Option A) |
| Deep link pedidos | `OrdersPage` deve honrar `?p={order_code}` |
| Deep link serviços | Honrar `?s=` + `?h=` (highlight) além de `?u=` |
| Rota `/app/associados` | Redirect → cadastramento **ou** omitir (menu já usa cadastramento) |
| Subtítulo paciente na tabela | Se `patient_user_code` do funil válido → mostrar esse; senão omitir ou listar count |
| Criar e-mail já existente | Seguir regras do funil (`ACCOUNT_EXISTS` / `ACCOUNT_IN_PROGRESS`) — não duplicar |

### Tornar associado (manual)

Botão no header do modal quando `status ≠ Associado` (ainda no funil / termo pendente / etc.):

| Campo | Valor ao confirmar |
|---|---|
| `status` | `Associado` |
| `associate_status` | `5` (funil concluído do ponto de vista do painel) |

Não gera termo. Não preenche `adhesion_term`. Confirmação explícita na UI.

### Termo — ciclo (app doc-sign)

Quando o módulo/app de termos existir — spec [`../../doc-sign/`](../../doc-sign/README.md):

1. **Gerar termo** → associado fica com status/label **Termo criado** (`associate_status=assinatura_termo` / contrato `pending`)
2. **Assinar** → `adhesion_term` + `associate_status=5` (handler interno na API; sem webhook o módulo de termos)

No painel v1 atual: botões “Novo Termo” / “Copiar link” **não** alteram banco (stub).

### Exclusão (regra global de vínculos)

**Nada pode ser excluído** se houver outros registros ligados.

| Entidade | Bloquear DELETE se existir |
|---|---|
| Associado (`users` responsável) | Pedidos (`user_code` / FK) **ou** serviços (`associate_user_code`) **ou** pacientes (`responsible_code`) |
| Paciente | Serviços com `patient_user_code` **ou** outros vínculos futuros |
| Profissional / colaborador | Serviços com `professional_id` |
| Prescritor (mesmo `professionals`) | Pedidos com `prescriber_code` / vínculo ao profissional |

Resposta API sugerida: **409** `HAS_LINKED_RECORDS` com detalhe do tipo de vínculo. Soft-delete de profissional (`active=0`) **permanece** como alternativa quando há histórico (já em serviços); hard delete só sem vínculos.

## Dependências

| Dep | Notas |
|---|---|
| App cadastramento / fases 1–5 | Labels/filtros alinhados |
| App/módulo assinatura de termos | Status “não assinado” → assinado |
| FileUpload | Já em `apps/kunk` |
| Serviços | Seletor beneficiário + pré-seleção via `patient_user_code` do funil |
| Search global | Mesmo epic recomendado |

---

## Checklist de implementação

### Schema / SQL

- [ ] `services.patient_user_code` (UUID nullable + FK opcional)
- [ ] Confirmar coluna `annotations`
- [ ] DELETE guards (associado / paciente / professional ↔ orders/services)

### API

- [ ] List/filter users painel (excluir patients)
- [ ] CRUD pacientes + bloqueio delete com vínculos
- [ ] PATCH annotations
- [ ] History orders+services
- [ ] Stubs `/terms/*`
- [ ] `PATCH` “tornar associado” (ou PATCH genérico com validação)
- [ ] Create service + `patient_user_code` + validação vínculo
- [ ] Search global (`GET /search`)

### Frontend `apps/kunk`

- [ ] Página Associados/Cadastramento
- [ ] Modal tabbed + Tornar associado + prescritor texto livre
- [ ] FileUpload; termo stub
- [ ] NewServiceModal: beneficiário + pré-seleção se funil tiver `patient_user_code`
- [ ] Templates observações/calendário
- [ ] Global search + deep links `?a=` `?p=` `?s=`/`?h=` `?t=`
- [ ] Rota/menu + `role_pages`

### Docs / inventário

- [x] Spec `associados/` + `search-global/`
- [x] Inventário pages + atualização serviços (beneficiário)
- [x] Decisões 1–5 (tornar associado, termo futuro, exclusão, prescritor livre, pré-seleção)
- [x] Semântica `patient_user_code` em cadastramento/fields + api/collections
- [x] Ambiguidades técnicas A–F documentadas neste gaps

---

## Ambiguidades técnicas (fechadas)

Detalhamento do que a implementação deve fazer. Defaults já valem como decisão.

### A) Anotações — como persistir

| Opção | Descrição |
|---|---|
| **A (escolhida)** | `PATCH /items/users/:id` com `annotations` = array JSON completo |
| B (não v1) | `POST/DELETE /users/:id/annotations/:id` |

**Implementar:** ao adicionar, client monta novo array (com `id`, `text`, `date_created`, `userName` do operador) e PATCHa. Ao excluir, remove o item e PATCHa. Server pode enriquecer `userName`/`user_code` se o client omitir. Sem tabela separada no v1.

---

### B) Deep link de pedidos `?p=`

| Histórico / search | Destino |
|---|---|
| Abrir pedido | `/app/loja/pedidos?p={order_code}` |

**Hoje no `apps/kunk`:** `?p=` é tratado principalmente em `CartPage` (novo pedido), não na listagem.

**Implementar:** em `OrdersPage`, ao montar, se `searchParams.get('p')` → buscar pedido por `order_code` (ou id) e abrir `OrderDetailsModal` / focar o card. Search global e histórico devem apontar para **OrdersPage**, não para o carrinho.

---

### C) Deep link de serviços `?s=` + `?h=`

| Param | Papel |
|---|---|
| `s` | Texto = `associate_name` (já usado como `q` inicial na ServicesPage) |
| `h` | ISO datetime do serviço  para **destacar** a linha certa quando há vários do mesmo nome |
| `u` | Pré-abre Novo Serviço com associado (triagem) — independente do search |

**Implementar:** além de setar `q` com `s`, se `h` presente → após load, scroll/highlight na linha cuja `consultation_date` ou `date_created` case com `h` (tolerância de parse ISO). Search global monta `?s=…&h=…` em versões anteriores.

---

### D) Rota `/app/associados`

Menu OSS já usa `/app/acolhimento/associados` (`PATHS.registration`).

**Implementar (escolher um):**

1. **Preferido:** não criar rota `/app/associados`; ou
2. Redirect `Navigate` → cadastramento (compat bookmarks histórico).

Não manter segunda cópia da página com `limit=-1` separado — se precisar “lista completa”, botão/filtro na mesma tela.

---

### E) Subtítulo “Paciente: …” na tabela de associados

Sem “paciente ativo” editável:

| Situação | UI |
|---|---|
| Responsável com `patient_user_code` válido (funil) e paciente `responsible_code` ok | Mostrar `Paciente: {nome}` desse código |
| Só pacientes via aba (sem ponteiro funil) / ponteiro inválido | **Omitir** subtítulo (ou, opcional depois: `N pacientes`) |
| Status patient na lista principal | Nunca — patients filtrados fora |

---

### F) Criar associado no painel com e-mail já cadastrado

Alinhar ao funil (`register-email` / exists):

| Situação | Resposta |
|---|---|
| E-mail livre | Cria (`associate_status=1`, etc.) |
| Já `status=Associado` | **409** `ACCOUNT_EXISTS` → UI: abrir existente / avisar |
| Em funil (`associate_status` 1–5) | **409** `ACCOUNT_IN_PROGRESS` → UI: abrir existente no modal |
| Só existe `patient` com esse e-mail | Não bloqueia create do responsável (mesma regra do cadastramento) |

**Não** criar segundo responsável com o mesmo `email_account`.

---

## Bloqueantes de produto

Nenhum para o painel v1. App de assinatura de termos é entrega separada.
