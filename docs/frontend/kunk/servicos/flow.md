# Serviços — Fluxos

## Atores e acesso a páginas

O acesso a Serviços (e demais páginas do Kunk) **não** fica hardcoded só por role na feature.

| Camada | Comportamento |
|---|---|
| **Admin → páginas por role** | Configurável (ver [admin.md](./admin.md#3-páginas-do-kunk-por-role) e [`../../admin/flow.md`](../../admin/flow.md)) |
| **Default** | Todas as páginas do menu Kunk liberadas para todas as roles staff (`Administrador`, `Acolhimento`, `Produção`, …) |
| **Produção** | Por default **pode** acessar Serviços (está no allow-all) |

Roles staff entram no app Kunk; o menu/rotas filtram pela config `role_pages`. Sem config / `*` = allow-all.

---

## 1. Entrada pela triagem

```
Triagem finaliza com ação "Serviço"
  → redirect /app/acolhimento/servicos?u={user_code}
  → abre modal "Novo Serviço" com associado pré-carregado
```

Sem `?u=`, a lista abre normalmente; “Novo Serviço” pode abrir o seletor de associado.

---

## 2. Criar serviço (um ou vários profissionais)

```
Modal Novo Serviço
  1. Associado responsável (busca por nome / user_code)
  2. Beneficiário do atendimento (NOVO — ver §2.1)
       ○ O próprio associado responsável
       ○ Um dos pacientes (GET patients do responsável)
  3. Opcional: "Relacionar a serviço existente"
       → reusa booking_group_code do serviço selecionado
  4. Autocomplete múltiplo de profissionais
       → somente active + is_collaborator = true
  5. Por profissional selecionado:
       - Valor consulta (default = professional.consultation_price || default por type)
       - Doação
       - Valor pago (registro manual; sem checkout)
       - Data/hora do atendimento (opcional)
       - Checkbox "Criar evento no calendário"
           · default desmarcado
           · ao selecionar a data → marca automaticamente
           · usuário pode desmarcar depois
  6. Tags + observações (compartilhadas do grupo)
  7. Criar
```

### 2.1 Beneficiário (associado vs paciente)

No create, o operador escolhe para quem é o atendimento. O valor **persistido** no serviço é `services.patient_user_code` (não o ponteiro do funil, salvo na pré-seleção abaixo).

| Escolha | Persistência | Observações / calendário |
|---|---|---|
| Responsável | `associate_*` preenchidos; `patient_user_code = null` | Só dados do associado |
| Paciente X | `associate_*` = responsável; `patient_user_code` + `patient_name` = paciente | Template com Responsável **e** Paciente |

Validação: paciente deve ter `responsible_code = associate.user_code`.

#### Pré-seleção (deep link / triagem `?u=`)

Ao carregar o associado responsável:

1. Se `users.patient_user_code` no responsável existir **e** o paciente tiver `responsible_code` = esse responsável → **pré-selecionar** esse paciente como beneficiário
2. Senão → beneficiário = próprio responsável
3. Operador pode mudar o radio/select antes de criar

Spec cruzada: [`../associados/flow.md`](../associados/flow.md) §3 e [gaps.md](../associados/gaps.md) #19.

### Algoritmo de agrupamento (`booking_group_code`)

```
se selectedBookingGroupCode:
  groupCode = selectedBookingGroupCode
senão:
  groupCode = uuidv4()

para cada profissional em selectedProfessionals:
  POST serviço {
    booking_group_code: groupCode,
    service_code: uuidv4(),          // único por linha
    professional_id, professional_name, professional_email,
    type: professional.type,
    price: valorConsultaDoProfissional,
    donation, price_paid,
    consultation_date,               // pode ser null
    associate_*, observations, tags, ...
  }
  se create_calendar_event && consultation_date && professional.calendar_id:
    POST /modules/google_calendar/events → PATCH event_id / event_link
```

Regras:

- **1 associado + N profissionais** no mesmo create → **N linhas** com o **mesmo** `booking_group_code`.
- Adicionar profissional a um grupo já existente → reutiliza o `booking_group_code` (legado: “Precisa adicionar um novo profissional?”).
- Se relacionar a um serviço existente **sem** profissional preenchido → PATCH no primeiro registro do grupo em vez de criar linha nova (comportamento legado).
- Serviço **pode** ser criado **sem** `consultation_date`; a data entra depois (edição na tabela ou modal) e o evento via botão Agendar ou novo fluxo de data.

Grupo visual na lista: bolinha colorida derivada do hash do `booking_group_code` (`uuidToColor`).

### Definição de “serviço agrupado” (para textos / ações de grupo)

```
isGroupedService =
  serviçosComMesmoBookingGroupCode.length >= 2
  AND profissionaisDistintosNoGrupo.size >= 2
```

Usado no modal Info (listar todos os profissionais/datas) e em ações que afetam o grupo (ex.: upload de comprovante em todos os IDs).

---

## 3. Listar e filtrar

```
GET /services (ou /items/services com filtros)
  → janela padrão: últimos 14 dias (date_created)
  → filtros client/server:
       busca texto (associado, profissional, datas, preços)
       intervalo de datas
       tags
       avatar / created_by_user_code
       status (incl. Aguardando Pagamento / Pagamento Concluído)
```

Manter coluna e toggle/filtro de **status de pagamento** (`Aguardando Pagamento` | `Pagamento Concluído`) como no legado — **sem** integração de checkout: o operador marca manualmente.

---

## 4. Modal Infos (“Observações do Serviço”)

```
Clique Info na linha
  → selectedService = linha
  → GET profissionais (detalhe do professional_id)
  → GET /services?booking_group_code=X  (grupo)
  → monta template de observações se vazio / atualiza bloco de profissionais
  → abre Dialog
```

Ações no modal:

| Ação | Efeito |
|---|---|
| Alterar profissional | PATCH `professional_*` + `type`; se houver `event_id`, move evento no Google Calendar |
| Editar telefone do associado | PATCH user |
| Tags | Autocomplete + chips |
| Observações | Textarea (template editável) |
| Tipo de pagamento | Select manual (Pix, Boleto, …) — **sem** gerar link |
| Comprovante | Upload `services_files` (tipo service); se agrupado, associa a todos os IDs do grupo; **ao enviar, marca status `Pagamento Concluído`** nos serviços afetados |
| Salvar | PATCH observations, tags, payment_type |

Fechar: limpa selectedService / profissional carregado; não precisa limpar o texto de obs em memória até o próximo open (legado).

Detalhe visual: [ui-ux.md](./ui-ux.md#modal-infos-do-serviço).

---

## 5. Agendar no Google Calendar

Pré-requisitos: módulo `google_calendar` enabled + OAuth ok + profissional com `calendar_id` (calendário **secundário** do profissional).

Modelo de agendas (ver [admin.md](./admin.md)):

```
Calendário principal (associação)  ← primary_calendar_id
  └── calendários secundários      ← um por profissional (calendar_id)
        → eventos de consulta vão no secundário do profissional
```

### 5a. No create (checkbox por profissional)

| Condição | Efeito |
|---|---|
| Checkbox marcado + data + `calendar_id` | Cria evento após gravar o serviço |
| Checkbox desmarcado | Só grava o serviço (com ou sem data) |
| Sem data | Checkbox permanece desmarcado; evento depois via botão ou ao editar data |

### 5b. Botão Agendar na linha (serviço já existente)

```
Clique Agendar / Consulta
  → sem event_id: POST /services/:id/schedule → grava event_id/event_link → abre link
  → com event_id (ícone verde): menu
       · Abrir no Google Calendar
       · Cancelar evento → DELETE /services/:id/schedule (remove no Google + limpa event_id/event_link)
```

### 5c. Editar data de serviço que já tem evento

```
Usuário altera consultation_date
  → se service.event_id existe:
       Modal de aprovação:
         “Excluir o evento antigo e criar um novo com a nova data?”
         [Cancelar]  [Aprovar]
       → Aprovar: DELETE evento antigo + POST novo + PATCH event_id/event_link + date
       → Cancelar: não altera data nem evento
  → se não tem event_id:
       PATCH só a data (opcional: perguntar se quer criar evento — ou deixar para o botão Agendar)
```

### 5d. Troca de profissional com evento existente

```
DELETE evento no calendar_id antigo
POST evento no calendar_id novo (após aprovação se mudar data no mesmo fluxo)
PATCH event_id / event_link
```

Sem `calendar_id` no profissional → toast orientando configurar na gestão de profissionais.  
**Não** usar `primary_calendar_id` como destino do evento de consulta.

---

## 6. Editar campos na tabela

Clique em preços → modal/inline → PATCH.  
Clique em data → se houver `event_id`, fluxo **5c** (modal de aprovação); senão PATCH direto.

Toggle status pagamento na tabela: `Aguardando Pagamento` ↔ `Pagamento Concluído` (manual; serviços sem split SC).  
Upload de comprovante → também define `Pagamento Concluído`.  
PaymentModal (se `pagarme` on): ver [`../pagamentos-soucannabis/flow.md`](../pagamentos-soucannabis/flow.md).

Excluir linha → confirmação → DELETE (+ DELETE evento Google se `event_id`).

---

## 7. Gestão de profissionais

Rota: `/app/profissionais` (substitui o foco de `/app/prescritores`; redirect ok).

Mesma tabela `professionals` — dois papéis (flags independentes, podem coexistir):

| Flag | Significado | Onde aparece |
|---|---|---|
| `is_collaborator` | Colaborador da associação (atendimento) | Autocomplete de **Serviços** |
| `is_prescriber` | Emite receitas (interno ou cadastrado a partir de receita de associado) | Prescritor em **Pedidos / loja**; contabilização de receitas |

```
Lista
  → filtros claros: Todos | Colaboradores | Prescritores | Ambos
  → + active / type / busca
Criar / Editar
  → dados cadastrais
  → type (especialidade)
  → consultation_price (relevante p/ colaboradores / serviços)
  → is_collaborator (“Colaborador — mostrar em Serviços”)
  → is_prescriber (“Prescritor — receitas / pedidos”)
  → calendar_id = calendário secundário deste profissional
Excluir
  → **soft-delete**: active = 0 (nunca apagar hard se houver histórico desejado)
```

Só `is_collaborator` truthy entra no Autocomplete de serviços.  
Prescritores “de fora” ficam com `is_prescriber` e em geral **sem** `is_collaborator`, até a associação marcá-los como colaboradores.

---

## 8. Admin — Google Calendar

```
Admin → Serviços externos → Google Calendar
  1. Credenciais OAuth (client_id, client_secret, redirect_uri)
  2. Autorizar conta Google (refresh_token)
  3. Testar (listar calendários)
  4. Selecionar calendário principal da aplicação
  5. Enabled = true
```

Detalhe: [admin.md](./admin.md) + [`../../api/modules/google_calendar.md`](../../api/modules/google_calendar.md).
