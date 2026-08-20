# Relatórios de serviços — UI/UX (`apps/kunk`)

> **Obrigatório:** replicar layout, hierarquia visual e padrões do legado `reportServices.jsx`.
> Fonte: `kunksoucannabis/src/components/master/reportServices.jsx` + classes `pageContainerOptions` / `pageContainerTable`.
> **Não** portar cupons, cadastrar recebedor, botão Pagamento (n8n), Utalk.

## Rotas

| Superfície | Rota | Shell |
|---|---|---|
| Staff | `/app/relatorios/servicos` | Theme (sidebar) |
| Profissional | `/relatorio/servicos` | Página dedicada (sem menu staff) |

Permissões staff: conforme `kunk.role_pages` (incluir id `relatorios-servicos`).  
Profissional: role `Profissional` → só esta página.

---

## Tokens visuais (legado)

| Token | Valor | Uso |
|---|---|---|
| Verde institucional | `#5a7a5b` | Header da tabela |
| Roxo ações | `#7a5b7a` | Botão Atualizar |
| Vermelho logout | `#d32f2f` | Sair (portal) |
| Fundo contestação | `rgba(244, 67, 54, 0.1)` | Cards “faltam dados” |
| Fundo opções | `#f5f5f5` | Barra `pageContainerOptions` |
| Border radius opções | `30px` | Container de filtros |

---

## Estrutura da página (staff e portal)

```
┌─ pageContainerOptions ─────────────────────────────────────┐
│  [Mês/Ano]  [Profissional?]     [Exportar PDF] [Atualizar] │
│                             (+ Sair no portal profissional) │
└────────────────────────────────────────────────────────────┘

┌─ pageContainerTable ───────────────────────────────────────┐
│  Título: Relatório de Serviços (Agrupado por Mês e Prof.)  │
│  (se profissional filtrado) Totais: N registros · R$ …     │
│                                                            │
│  março 2026 — Total: …                                     │
│    Profissional: Nome — Total: …                           │
│      [cards contestação se houver]                         │
│      [barra Aprovar/Contestar se seleção — só staff]       │
│      Tabela (#5a7a5b header)                               │
│        Comp · Sel · Data · Associado · Valor pago ·        │
│        Doação · Valor consulta · Valor a receber           │
└────────────────────────────────────────────────────────────┘
```

Manter composição “opções em cima / tabela agrupada embaixo” — **não** cards de KPI soltos na primeira viewport.

---

## Barra de filtros

| Controle | Staff | Portal profissional |
|---|---|---|
| Mês/Ano | Sim — default mês anterior | Sim |
| Autocomplete Profissional | Sim (oculto se `?p=` / escopo) | **Não** |
| Exportar PDF | Sim | Sim |
| Atualizar | Sim | Sim |
| Sair | Opcional (já tem shell) | **Sim** (obrigatório no portal) |
| Cupons | **Não** | **Não** |
| Cadastrar recebedor | **Não** | **Não** |

### Opções de mês

- Lista: meses do ano corrente até o mês atual (`janeiro 2026` …)
- Label format: `mês longo + ano` sem “de” (legado)
- Default ao abrir: **mês civil anterior**

---

## Tabela — colunas

| Coluna | Conteúdo |
|---|---|
| Comp | Ícone/atalho comprovantes do serviço (reutilizar viewer existente se houver) |
| Selecionar | Checkbox — **só staff** (aprovação em lote) |
| Data | `consultation_date` formatada pt-BR |
| Associado | `associate_name` (clicável → modal resumo associado/paciente se staff) |
| Valor pago | `price_paid` ou `price − donation` (informativo) |
| Doação | `donation` |
| Valor da consulta | `price` |
| Valor a receber | `payable` (price − association_fee) |

Indicador visual de `commission_validation` (ícone approved/contested) na linha ou na coluna Selecionar — espelhar legado.

Ordenação: Data, Associado, valores (como legado `TableSortLabel`).

---

## Agrupamento e totais

1. Grupo nível 1: **mês/ano** de `consultation_date` (“Sem data” se inválida)
2. Grupo nível 2: **nome do profissional**
3. Linhas: serviços do grupo, sort default por data asc

Totais usam **sempre** a fórmula `payable` ([fields.md](./fields.md)) — staff e portal idênticos.

---

## Contestações UI

### Portal — criar

Botão warning **“Estão faltando dados”** (oculto em `/app`):

- Abre dialog “Contestar Serviço” (título legado; texto = motivo livre)
- Envia append em `contest_reports` com `month` = mês selecionado

### Staff — listar / resolver

Sob o subtítulo do profissional, lista filtrada pelo mês:

- Data + texto
- Ícone Done → remove do array

Sem toast WhatsApp no v1.

---

## Ações em lote (só staff)

Quando `selectedServices.length > 0`:

| Botão | Cor | Ação |
|---|---|---|
| Aprovar (N) | success | `commission_validation=approved` |
| Contestar (N) | error | `commission_validation=contested` |
| Limpar seleção | info | UI |

**Não** renderizar botão amarelo “Pagamento”.

---

## Portal profissional — chrome

| Elemento | Comportamento |
|---|---|
| Sem Sidebar Theme | Página full-width com barra de opções |
| Título / identidade | Nome do profissional visível |
| Não autorizado | Se role ≠ Profissional (e não staff) → `/nao-autorizado` |
| Sem sessão | `/login` |

---

## Exportar PDF

- Título “Relatório de Serviços”
- Mesmos grupos e colunas da tabela
- Nome arquivo: `{YYYY}-{MM} - Relatorio-Servicos - {Profissional|Todos}.pdf`
- Valores: usar fórmula OSS de `payable`

---

## Remover da UI legada

| Controle / bloco | Ação |
|---|---|
| Menu Cupons / CreateCouponModal | Não portar |
| Cadastrar recebedor | Não portar |
| Botão Pagamento (webhook) | Não portar |
| Utalk ao resolver contestação | Não portar |
| Bônus visual por tag terapeuta | Não portar |
