# Search global — Documentação de implementação

> Página de associados: [`../associados/README.md`](../associados/README.md).

## Objetivo

1. FAB **Pesquisar** fixo (canto superior direito) em todas as rotas autenticadas do shell
2. Modal com abas/rádios: **Associados · Pedidos · Serviços · Triagem**
3. Abrir o item na página respectiva (nova aba), com o **mesmo layout** anteriores
4. Em associados: abrir cadastramento **ou** enviar para triagem

## Fora de escopo

| Item | Motivo |
|---|---|
| Busca full-text em arquivos/docs | Não existe antes |
| Substituição da pesquisa local das páginas | Continua existindo (tabela serviços/pedidos/associados) |
| Beeviral / campos SC | Removidos |

## Índice

| Documento | Conteúdo |
|---|---|
| [flow.md](./flow.md) | Fluxos por entidade + deep links |
| [ui-ux.md](./ui-ux.md) | Layout histórico do FAB + dialog |
| [api.md](./api.md) | `GET /search` |
| [gaps.md](./gaps.md) | Decisões + checklist |

## Posicionamento

```
apps/kunk (Theme / shell)
  └── GlobalAppSearch (FAB + Dialog)
         │
         ▼
    kunk-api  GET /v1/search?entity=&q=&page=&limit=&sortField=&sortDir=
         │
         ├── users | orders | services | reception
         ▼
    Deep links
         ├── /app/acolhimento/associados?a=
         ├── /app/loja/pedidos?p=  (ou equivalente OSS)
         ├── /app/acolhimento/servicos?s=&h=
         └── /app/acolhimento/triagem?t=  (ou fila com code)
```

## Princípios

| Fazer | Não fazer |
|---|---|
| Copiar UX do `GlobalAppSearch` | Esconder search só no header genérico sem FAB |
| Abrir resultado em **nova aba** | Só filtrar a página atual sem navegação |
| Enriquecer associados paciente→responsável (`gs_meta`) | Mostrar paciente órfão sem contexto |
| Ação Triagem nos associados | Forçar só “abrir” |

## Status

`pronta para implementação`.
