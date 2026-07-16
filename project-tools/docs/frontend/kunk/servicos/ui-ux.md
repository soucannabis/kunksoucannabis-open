# Serviços — UI/UX (`apps/kunk`)

> **Obrigatório:** replicar layout, hierarquia visual e padrões do legado `services.jsx`.
> Fonte: `kunksoucannabis/src/components/master/services.jsx` + classes em `App.css`.
> Beeviral fora. Toggle pago/pendente e comprovante permanecem. PaymentModal quando `pagarme` ativo — [`../pagamentos-soucannabis/ui-ux.md`](../pagamentos-soucannabis/ui-ux.md).

## Rota

`/app/acolhimento/servicos` dentro do shell Theme.

Permissões: conforme `kunk.role_pages` (default: todas as roles staff, incl. Produção).

---

## Tokens visuais (legado)

| Token | Valor | Uso |
|---|---|---|
| Verde institucional | `#5a7a5b` | Header da tabela, ações primárias |
| Verde hover | `#303B30` | Hover botões verdes |
| Fundo opções | `#f5f5f5` | Barra `pageContainerOptions` |
| Roxo ações | `#7a5b7a` | Botão Atualizar / secundários |
| Info | `#1976d2` | Botão Info |
| WhatsApp (se vier depois) | `#25D366` | Fora do v1 |
| Border radius opções | `30px` | Container de filtros |
| Border radius dialog | `20px` | Modais |
| Padding opções | `50px 25px` | Container de filtros |

Cores de status/ações devem reutilizar o CSS já existente em `apps/kunk` quando houver equivalente; na dúvida, espelhar os hex acima.

---

## Estrutura da página

```
┌─ pageContainerOptions (#f5f5f5, radius 30, padding 50×25) ─┐
│  [Pesquisar]  [Data inicial] [Data final]                    │
│  [AvatarGroup]  [Tags]  [Toggle pago/pendente]  [Atualizar]  │
└──────────────────────────────────────────────────────────────┘

┌─ pageContainerTable (Paper / Table) ─────────────────────────┐
│  Header bg #5a7a5b · texto branco                            │
│  Colunas:                                                    │
│  Avatar+data_created · ●code · Tags · Data · Associado ·     │
│  Profissional · Valor pago · Doação · Valor consulta ·       │
│  Status pagamento · Ações                                    │
│  (sem Beeviral / sem botão checkout Pagamento)               │
└──────────────────────────────────────────────────────────────┘

Modais: Novo Serviço · Infos · Editar data/evento · Editar campo · PaymentModal (se `pagarme` on)
```

### Classes / containers

| Bloco | Classe / padrão legado |
|---|---|
| Barra superior | `Box` + `className="pageContainerOptions"` |
| Tabela | `TableContainer` + `className="pageContainerTable"` + `Paper` |
| Header tabela | background `#5a7a5b`, color `#fff` |

Manter a mesma composição “opções em cima / tabela embaixo” — **não** transformar em cards de dashboard na primeira viewport.

---

## Barra de filtros

| Controle | Comportamento (legado) |
|---|---|
| Pesquisar | Normaliza NFD; palavras em qualquer ordem em `associate_name` / `professional_name`; também data e preços |
| Data inicial / final | Filtra `date_created`; **default últimos 14 dias** |
| AvatarGroup | Filtra por `created_by_user_code` (quem criou) |
| Select tags | Match exato em `service.tags` |
| Toggle pago / pendente | Ícones verde `CheckCircle` vs azul `AccessTime` → filtro `showOnlyPaid` (status `Pagamento Concluído` vs `Aguardando Pagamento`) — **manual, sem checkout** |
| Atualizar | Botão roxo `#7a5b7a` — refetch |

### Remover da barra

| Controle legado | Ação |
|---|---|
| Coluna / filtro Beeviral | Não renderizar |

“Novo Serviço”: deep link `?u=` **e** botão visível “Novo Serviço” na barra.

---

## Tabela — colunas

| Coluna | Conteúdo |
|---|---|
| Criação | Avatar do `created_by` + `date_created` formatada |
| Grupo | Bolinha colorida `uuidToColor(booking_group_code)` — mesmo hue para linhas do mesmo grupo |
| Tags | Chips |
| Data | `consultation_date` (clicável → editar) |
| Associado | `associate_name` |
| Profissional | `professional_name` |
| Valor pago | `price_paid` (clicável → editar) |
| Doação | `donation` (clicável → editar) |
| Valor consulta | `price` (clicável → editar) |
| Status pagamento | `Aguardando Pagamento` / `Pagamento Concluído` (toggle manual) |
| Ações | Agendar · Info · Comprovante · Excluir (**sem** botão checkout Pagamento) |

### Agrupamento visual

Não colapsar linhas: **uma linha = um registro**. O vínculo de grupo é a bolinha + o modal Info que lista o grupo.

```js
// uuidToColor: hash do UUID → HSL → hex (portar do legado)
```

### Ações por linha

| Botão | Cor / ícone | Ação |
|---|---|---|
| Agendar / Consulta | Calendar | Cria/atualiza evento Google (se módulo on) |
| Info | `#1976d2` | Abre modal Infos |
| Comprovante | — | Upload / ver documentos do serviço |
| Excluir | — | Confirmação → delete (+ evento) |

**Não** incluir botão “Pagamento”.

---

## Modal Novo Serviço

| Propriedade | Valor legado |
|---|---|
| Largura | ~700px |
| `borderRadius` | `20px` |
| Backdrop click | **Não** fecha |
| Título | Novo Serviço |

### Conteúdo (ordem)

1. Form / busca de **associado responsável** (pré-fill se `?u=`)
2. **Beneficiário do atendimento** (radio / select):
   - O próprio associado responsável
   - Paciente da lista (`GET /users/:id/patients`)
   - **Default:** se o responsável tiver `patient_user_code` válido (funil) → pré-selecionar esse paciente; senão o responsável
   - Operador pode alterar antes de criar
3. Autocomplete opcional: **Relacionar a serviço existente** (reusa `booking_group_code`)
4. Autocomplete **múltiplo** de profissionais (`is_collaborator` only)
5. Bloco por profissional:
   - Valor consulta (pré-preenchido)
   - Doação
   - Valor pago
   - `datetime-local` da consulta (opcional)
   - Checkbox **Criar evento no calendário**
     - default **desmarcado**
     - ao escolher a data → **marca automaticamente**
     - usuário pode desmarcar
6. Tags (compartilhadas)
7. Observações (compartilhadas; template considera beneficiário)
8. Botão Criar

Sem seção de cupons. Sem geração de payment_link. Sem “paciente ativo” implícito.

---

## Modal Infos do serviço

Espelhar o dialog legado “Observações do Serviço” (`observationsModal`).

### Open

1. Seta serviço selecionado
2. Carrega profissional
3. Busca grupo por `booking_group_code`
4. Monta/atualiza texto de observações (template — ver [fields.md](./fields.md#5-template-de-observações-modal-info))
5. Carrega tags e `payment_type`

### Layout interno (ordem)

```
┌─ Observações do Serviço ─────────────────────────────┐
│  Profissional: nome · e-mail · tipo                  │
│  [Alterar profissional] → Autocomplete               │
│                                                      │
│  Telefone do associado (editável)                    │
│                                                      │
│  Tags (Autocomplete + chips coloridos)               │
│                                                      │
│  Observações (textarea — template editável)          │
│                                                      │
│  Tipo de pagamento (select manual)                   │
│                                                      │
│  Comprovante (Documents type=service)                │
│  → ao enviar: status = Pagamento Concluído           │
│                                                      │
│                         [Cancelar]  [Salvar]         │
└──────────────────────────────────────────────────────┘
```

### Remover do modal legado

| Bloco | Motivo |
|---|---|
| Botão excluir `payment_link` | Sem checkout |
| CTA PaymentModal | Condicional a `modules.pagarme.use_for_services` — ver pagamentos-soucannabis |

### Alterar profissional

Autocomplete → PATCH; se `event_id` e módulo Google on → move evento (delete + create).

---

## Modal editar data (com evento existente)

Se o serviço já tem `event_id` e o usuário altera `consultation_date`:

```
┌─ Alterar data do evento ─────────────────────────────┐
│  Este serviço já possui um evento no calendário.     │
│  Excluir o evento antigo e criar um novo com a       │
│  nova data?                                          │
│                                                      │
│              [Cancelar]  [Aprovar]                   │
└──────────────────────────────────────────────────────┘
```

- **Aprovar** → DELETE evento antigo + POST novo + PATCH serviço (data + event_*)  
- **Cancelar** → não persiste a nova data

Sem `event_id`: PATCH da data normalmente; evento fica para o botão Agendar (ou checkbox só no create).

## Modal editar campo (preços)

Dialog simples para PATCH de `price`, `donation`, `price_paid`.

---

## Página Profissionais (`/app/profissionais`)

```
┌─ Filtros: busca · type · active ─────────────────────┐
│  Chips: [Todos] [Colaboradores] [Prescritores] [Ambos]│
│  [Novo profissional]                                   │
└────────────────────────────────────────────────────────┘

Tabela:
  Nome · Tipo · Papéis (chips Colaborador / Prescritor) ·
  Valor consulta · Agenda (secundário) · Ações
```

### Dialog criar / editar

| Campo | Controle |
|---|---|
| Nome, sobrenome, e-mail, telefone, CPF | Inputs |
| Estado / cidade | Inputs / selects |
| Tipo (`type`) | Select obrigatório |
| Especialidade (`specialty`) | Texto livre |
| Valor da consulta (`consultation_price`) | Number |
| Colaborador — mostrar em Serviços (`is_collaborator`) | Switch |
| Prescritor — receitas / pedidos (`is_prescriber`) | Switch |
| Ativo | Switch |
| Agenda secundária (`calendar_id`) | Select (sem o calendário principal da associação) |

CreateRecipientModal / ranking de split: fora desta página (Pagarme em Serviços externos).

---

## Deep links

| Query | Efeito |
|---|---|
| `?u={user_code}` | Abre Novo Serviço com associado |
| `?s={texto}` | Pré-preenche busca |

---

## O que manter vs remover (resumo visual)

| Bloco legado | OSS |
|---|---|
| `pageContainerOptions` + tabela verde | Manter |
| Bolinha de grupo por `code` | Manter (`booking_group_code`) |
| Modal Info completo | Manter (sem payment_link) |
| Modal Novo Serviço multi-profissional | Manter + checkbox evento |
| Toggle / coluna status pagamento | **Manter** (manual, sem checkout) |
| Botão / modal Pagamento (Pagar.me) | Condicional ao módulo `pagarme` — spec pagamentos-soucannabis |
| Beeviral | **Remover** |
| WhatsApp | Adiar (módulo Utalk) |
| Cupons | **Remover** |
