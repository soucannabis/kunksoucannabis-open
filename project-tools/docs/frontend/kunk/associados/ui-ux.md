# Associados — UI/UX (`apps/kunk`)

> **Obrigatório:** replicar layout, hierarquia visual e padrões do legado `dash.jsx` + `table.jsx` + `UserModal.jsx`.
> Fonte: `kunksoucannabis/src/components/master/dash.jsx`, `table.jsx`, `modals/UserModal.jsx`.
> Cores alinhadas a Serviços / Triagem (`#5a7a5b`, `#7a5b7a`, …).

## Rotas

| Rota | Uso |
|---|---|
| `/app/acolhimento/cadastramento` | Página principal (últimos N) |
| `/app/associados` | Opcional: mesma página com limite alto / “todos” |

Permissões: `kunk.role_pages` (default allow-all staff).

Deep link: `?a={user_code}` → abre modal.

---

## Tokens visuais

| Token | Valor | Uso |
|---|---|---|
| Verde institucional | `#5a7a5b` | Header tabela, chips de aba, ações primárias |
| Verde hover | `#303B30` | Hover |
| Fundo opções | `#f5f5f5` | Barra superior |
| Roxo ações | `#7a5b7a` | Recarregar / secundários |
| FAB search (global) | `#7A5B7A` | Ver search-global |
| Border radius opções | `30px` | Container filtros |
| Modal associado | ~1020px · ~88vh | Joy/MUI Dialog |

Stack: MUI (+ Joy se já usado no shell) — igual ao restante do `apps/kunk`.

---

## Estrutura da página

```
┌─ pageContainerOptions ───────────────────────────────────────┐
│  [Criar Associado]  [Recarregar]  [Filtrar Associados ▾]     │
│  "Mostrando os últimos N cadastros"                          │
│  Cards: Não preencheu | Preencheu | Termo | Erro | …         │
└──────────────────────────────────────────────────────────────┘

┌─ pageContainerTable ─────────────────────────────────────────┐
│  [Pesquisar...]                                              │
│  Header #5a7a5b                                              │
│  Avatar | Nome (+ paciente) | E-mail | Telefone | Status |   │
│  Criado | Ações (triagem se Associado)                       │
│  Paginação / Carregar mais                                   │
└──────────────────────────────────────────────────────────────┘

Modal UserModal (ao clicar avatar / ?a=)
```

### Cards de status

Contagens clicáveis que filtram a tabela (como legado). Labels alinhados às fases OSS ([fields.md](./fields.md)).

### Menu filtrar

Itens equivalentes ao legado, com labels OSS:

- Associado
- Não preencheu
- Apenas preencheu
- Termo / fase 4
- Erro no formulário

---

## Tabela

| Coluna | Conteúdo |
|---|---|
| Avatar | Abre modal |
| Nome | `fullname` ou nome+sobrenome; subtítulo se houver paciente vinculado no funil |
| E-mail | `email_account` / `email` |
| Telefone | `mobile_number` |
| Status | Label mapeado |
| Criado | `created_date` |
| Ações | Enviar para triagem (se Associado) |

Pesquisa local: filtra linhas já carregadas (nome, e-mail, telefone, nome de paciente listado).

---

## Modal — layout

```
┌─ Header ─────────────────────────────────────────────────────┐
│  [Avatar]  Nome completo                                     │
│            Associado desde dd/mm/aaaa                        │
│            [Tornar associado]  [Termo ▾]                     │
├─ Tabs ───────────────────────────────────────────────────────┤
│  Dados Pessoais | Pacientes | Prescritor | Anotações |       │
│  Documentos | Histórico                                      │
├─ TabPanel ───────────────────────────────────────────────────┤
│  …conteúdo…                                                  │
└──────────────────────────────────────────────────────────────┘
```

### Diferenças vs legado (obrigatórias)

| Legado | OSS |
|---|---|
| Aba “Prescritor e Parceiro” | Aba **Prescritor** apenas |
| Tornar Ativo / Remover Ativo | **Remover** da UI |
| DocuSeal Novo Termo | Stub (toast / 501) — sem side effects |
| `?u=` em alguns links | Padronizar deep link painel: `?a=` |

### Aba Dados Pessoais

Form em grid (legado `Form`), CIAP2, botões Salvar / Excluir.

### Aba Pacientes

- Botão criar paciente
- Accordion por paciente (editar, CIAP, excluir)
- Sem destaque de “ativo”

### Aba Prescritor

- Campo **texto livre** para nome do prescritor (`prescriber`)
- `prescriber_code` opcional
- Data receita
- `FileUpload kind="prescription"`
- Sem autocomplete obrigatório de profissionais; sem Parceiro

### Aba Anotações

Lista + campo texto + adicionar; cada item com autor e data; excluir.

### Aba Documentos

`FileUpload` sem `kind` fixo (seletor de tipo).

### Aba Histórico

Tabela(s) pedidos + serviços; links opcionais para abrir páginas (`?p=`, `?s=`).

---

## Criar associado

Dialog simples: e-mail (+ feedback de conta existente / em progresso, alinhado ao cadastramento).

---

## Não fazer

- Cards de métricas no estilo dashboard moderno no hero
- Drawer genérico no lugar do modal tabbed
- Reintroduzir Parceiro no modal
- Implementar DocuSeal “só um pouco”
