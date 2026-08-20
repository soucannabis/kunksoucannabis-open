# Search global — UI/UX

> **Obrigatório** manter a mesma composição visual.

## FAB

| Prop | Valor |
|---|---|
| Posição | `fixed`, top abaixo do header, `right: 54` |
| Label | Pesquisar + ícone Search |
| Cor | `#7A5B7A` · hover `#6a4e6a` |
| z-index | Acima do sidebar (histórico ~14000 no dialog) |

Visível em todas as rotas do Theme autenticado.

## Dialog

- `maxWidth="lg"` · `fullWidth`
- Altura ~72–94vh, conteúdo scrollável
- Título dinâmico: “Buscar associados” / “Buscar Pedidos” / “Buscar Serviços” / “Buscar Triagem”
- Texto da UI principal em preto (`#000`) — evita cinza do theme em labels/radios

### Layout interno

```
┌─ Título ─────────────────────────────────────────────────────┐
│                                                              │
│  ┌ Onde pesquisar ┐  ┌ Termo + hint + Consultar ──────────┐ │
│  │ ○ Associados   │  │ [________________]  [Consultar]    │ │
│  │ ○ Pedidos      │  │ hint…                              │ │
│  │ ○ Serviços     │  │ (pedidos: ○ nome ○ rastreamento)   │ │
│  │ ○ Triagem      │  └────────────────────────────────────┘ │
│  └────────────────┘                                          │
│  ┌ Tabela resultados ─────────────────────────────────────┐ │
│  │ colunas por entidade · sort no header · ações          │ │
│  │ paginação                                              │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Colunas

| Tab | Colunas |
|---|---|
| Associados | Nome (blocos gs_meta) · Status · E-mail · Telefone · Data cadastro · Abrir · Triagem |
| Pedidos | Associado · Rastreamento · Status · Criado · Abrir |
| Serviços | Associado · Data · Profissional · Abrir |
| Triagem | Nome · E-mail · Telefone · Criado · Ação · Abrir |

Nomes em title-case pt-BR (comversões anteriores `displayNameTitleCase`).

### Loading / erro

- `LinearProgress` / `CircularProgress` durante fetch
- Mensagem se `q` vazio ou erro de rede/API

## Não fazer

- Substituir por Command Palette só teclado sem o FAB roxo
- Mudar entidades da v1
- Abrir resultado só em modal sem deep link na página
