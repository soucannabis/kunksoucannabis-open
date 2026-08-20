# Relatórios de serviços — Fluxos

## Atores e acesso

| Ator | Auth | Rota | Escopo de dados |
|---|---|---|---|
| Staff (Administrador, Acolhimento, Financeiro, …) | `system_users` + `role_pages` | `/app/relatorios/servicos` | Todos os profissionais / serviços pagos |
| Profissional | `system_users` com role `Profissional` | `/relatorio/servicos` (fora do shell staff) | Só serviços do próprio `professional_code` |

| Camada | Comportamento |
|---|---|
| **Admin → páginas por role** | Role `Profissional` default: **apenas** página `relatorios-servicos` |
| **RBAC API** | Staff: leitura ampla; `Profissional`: filtro obrigatório `professional_id = session.internal_code` |
| **Login redirect** | `Profissional` → `/relatorio/servicos` (não entra no menu staff `/app`) |

Roles staff entram no shell Theme; o profissional **não** usa sidebar de acolhimento/loja — só o portal do relatório (+ logout).

---

## 1. Conta do profissional (sistema)

Só **colaboradores** que precisam do relatório. Prescritores “de fora” (só receita) **não** ganham role nem portal.

Criação **obrigatória na área de profissionais** (`/app/profissionais`), por registro:

```
Linha do profissional (is_collaborator)
  → ação "Criar conta" / "Enviar convite"
  → exige e-mail no cadastro do profissional
  → API:
       1. Cria (ou reutiliza) system_users:
            permissions = ["Profissional"]
            internal_code = professional_code
            email / name / last_name do profissional
            status = pending até concluir /cadastro
       2. Gera link assinado (token + expiração) → /cadastro?…
       3. Tenta enviar e-mail com o link
            → módulo e-mail ainda NÃO existe: stub + UI "Copiar link"
  → Profissional abre o link (válido só até expirar)
  → Tela /cadastro: define senha + dados necessários
  → Conta ativa → login no Kunk
  → Redirect SEMPRE /relatorio/servicos
  → Qualquer /app/* (exceto se no futuro liberarem algo) → bloqueado
```

| Campo `system_users` | Valor |
|---|---|
| `permissions` | **somente** `Profissional` (não misturar roles staff) |
| `internal_code` | `professionals.professional_code` |
| `email` / `name` / `last_name` | Do profissional |

Regras de acesso (hard):

- Role `Profissional` **nunca** acessa páginas operacionais do Kunk (associados, pedidos, serviços, etc.)
- `role_pages` default = `["relatorios-servicos"]` e guards de rota reforçam
- Um `professional_code` → no máximo **uma** conta portal
- Reenviar convite: novo token / nova expiração; invalidar o anterior

Referência legada: convite de usuários do sistema + [`systemUserSign.jsx`](../../../../kunksoucannabis/src/components/externalPages/systemUserSign.jsx) (`/cadastro`).  
Detalhe e-mail: [gaps.md § Integração futura](./gaps.md).

---

## 2. Relatório staff (`/app/relatorios/servicos`)

```
Abrir página
  → default mês = mês civil anterior
  → GET serviços:
       status = "Pagamento Concluído"
       consultation_date IS NOT NULL
       consultation_date no intervalo do mês (ou meses do ano se "Todos")
  → GET professionals (nomes + contest_reports)
  → montar árvore mês → profissional → linhas
```

Serviços **sem** data de consulta são **desconsiderados** (não listar, não somar).

### Filtros

| Controle | Comportamento |
|---|---|
| Mês/Ano | Select com meses do **ano corrente até o mês atual** (legado `getMonthsOfCurrentYear`); opção “Todos” |
| Profissional | Autocomplete — esconde quando deep link/`internal_code` fixa um profissional |
| Atualizar | Refetch |
| Exportar PDF | Tabela agrupada (Data, Associado, Valor pago, Doação, Valor consulta, Valor a receber) |

### Totais

| Contexto | Exibição |
|---|---|
| Profissional selecionado | `Total de registros` + `Valor a receber` (soma dos payables) |
| Sem profissional | Por mês e por profissional: contagem + soma (legado usava fórmula inconsistente; OSS usa **sempre** a fórmula de `payable` — ver [fields.md](./fields.md)) |

### Ações em lote (linhas selecionadas)

| Ação | Efeito |
|---|---|
| Aprovar | `PATCH commission_validation = approved` |
| Contestar | `PATCH commission_validation = contested` |
| Limpar seleção | Só UI |
| Pagamento | **Não portar** (webhook n8n SC) |

### Resolver contestação de “faltam dados”

Staff vê cards vermelhos sob o nome do profissional (mês filtrado).  
Botão “resolvido” → remove item de `contest_reports` (PATCH).  
**Sem** WhatsApp no v1.

---

## 3. Portal do profissional (`/relatorio/servicos`)

```
Login (role Profissional)
  → redirect /relatorio/servicos
  → API escopa automaticamente ao internal_code
  → filtro de profissional oculto (só ele)
  → mesmos agrupamentos / colunas / totais
  → botão "Estão faltando dados" → modal contestação
  → logout
```

Diferenças vs staff:

| Item | Staff | Profissional |
|---|---|---|
| Filtro profissional | Sim | Não (fixo) |
| Aprovar / contestar linhas | Sim | Não (só visualiza status) |
| Contestação “faltam dados” | Resolve | Cria |
| Exportar PDF | Sim | Sim |
| Shell Theme / sidebar | Sim | Não — página dedicada |

Deep link legado `?p=` no portal: se autenticado e `p ≠ internal_code` → 403 / não autorizado. Staff no `/app` pode usar `?p=` para pré-selecionar.

---

## 4. Contestação (“Estão faltando dados”)

```
Profissional clica "Estão faltando dados"
  → modal com motivo (texto obrigatório)
  → append em professionals.contest_reports:
       { text, date (ISO), month: "março 2026" }
  → staff vê no relatório do mês correspondente
  → staff marca resolvido → remove do array
```

Contestações são por **profissional + mês**, não por linha de serviço.  
Validação por linha (`commission_validation`) é independente.

---

## 5. Cálculo do valor a receber

```
fee = association_fee(type)   // admin; default 0; sempre aplica
payable = price - fee
if deduct_donation_from_payable:   // admin; default false
  payable = payable - donation
payable = max(0, payable)

Totais = soma dos payable do conjunto filtrado
```

Detalhe: [fields.md](./fields.md).

---

## 6. Tipos, taxas, doação e preço padrão (admin)

```
Admin → Tipos / relatório de serviços
  → CRUD tipos (id, label, association_fee, default_consultation_price)
  → Switch: "Descontar doação do valor a pagar ao profissional" (default off)
  → seed: tipos canônicos fee=0, price=null
```

Ao **criar serviço** (módulo Serviços):

```
price default =
  se tipo.default_consultation_price != null
    → usar esse valor          // anula consultation_price do profissional
  senão
    → professional.consultation_price
    → senão 0
```

Operador ainda pode editar `price` no serviço depois.

Detalhe UI admin: [admin.md](./admin.md).  
Impacto no create de serviços: atualizar [`../servicos/flow.md`](../servicos/flow.md) / fields.

---

## 7. Diagrama resumido

```
┌─────────────┐     login      ┌──────────────────┐
│ Profissional│ ─────────────► │ /relatorio/servicos│
│ (role)      │                │  escopo próprio    │
└─────────────┘                └─────────┬──────────┘
                                         │ contest_reports
                                         ▼
┌─────────────┐                ┌──────────────────┐
│ Staff       │ ─────────────► │ /app/relatorios/  │
│             │                │     servicos      │
└─────────────┘                └─────────┬──────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
              services            professionals         system_configs
         (pagos + validation)   (contest_reports)   (professional_types)
```
