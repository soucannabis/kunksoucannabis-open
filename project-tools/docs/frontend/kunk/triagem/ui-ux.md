# Triagem — UI/UX (`apps/kunk`)

## Rota

| Item | Valor |
|---|---|
| Path | `/app/acolhimento/triagem` |
| Stub atual | `apps/kunk/src/pages/reception/TriagePage.jsx` |
| Shell | Theme + Sidebar + QuickNav (já existentes) |
| Roles | alinhadas ao legado: Administrador \| Acolhimento \| Produção |

## Layout (espelhar legado, sem integrações)

```
┌─────────────┬──────────────────────────────────────────────────────┐
│ Status      │  [Busca]  [filtro atendente?]  [N na fila]  [Atualizar]│
│ (sidebar)   ├──────────────────────────────────────────────────────┤
│ Espera  (n) │  Tabela de receptions do status selecionado          │
│ … custom    │  # | Contato | Mensagem / custom | Ações             │
│ Concluído   │                                                      │
└─────────────┴──────────────────────────────────────────────────────┘
```

### Sidebar de status

- Lista dinâmica de `triage.statuses` ordenada.
- Chip/badge com contagem.
- Item ativo filtra a tabela.

### Coluna # / avatar

- Avatar (associado ou placeholder).
- Tempo desde `date_created`.
- **Clique no avatar** → menu de statuses (todos os cadastrados).
- Troca de status → PATCH + refresh contagens.

### Dados do contato

- Nome, e-mail, telefone (editável).
- Indicador de vínculo (associate_code / nome).
- **Campos personalizados** do form: bloco “Campos personalizados” lendo `tags.custom_fields` + labels da config.

### Ações

| Ação | Condição |
|---|---|
| Linkar associado | Sempre (busca users) |
| Deslinkar | Se linkado |
| Ir para Pedido | Só se `associate_code`; senão disabled + tooltip |
| Ir para Serviço | Só se `associate_code`; senão disabled + tooltip |
| Documentos/Dados | Só se `triage.module.associate_docs === true` **e** linkado |

### Explicitamente ausente na UI

- Botões/sync Utalk, “Ver no Utalk”, transfer
- Badges Beeviral / campanha
- Modal Histórico de doações
- FAB sync WhatsApp

## Deep link

Suportar `?t={reception.code}` para destacar/filtrar um contato (legado).

## Redirects

- Pedido: `/app/loja/novo-pedido?u={associate_code}` (ajustar quando a página de novo pedido existir; até lá, navegar para stub/rota definida).
- Serviço: `/app/acolhimento/servicos?u={associate_code}`.

## Formulário público (associados)

Página simples, brandável (pode reutilizar tokens de aparência Kunk ou registration):

- Renderiza apenas campos `enabled`.
- Validação client + server.
- Sucesso: mensagem de confirmação (“entrou na fila”), sem expor painel interno.

## Referência visual legada

Arquivos: `kunksoucannabis/src/components/master/reception.jsx`, `reception/ReceptionTableRow.jsx`.

Preservar: hierarquia sidebar + tabela + contagens. Não preservar: chrome Utalk/Beeviral/doações.
