# Analytics — Fluxo

## Filtro global

No topo da página:

1. Presets **Dia / Semana / Mês / Ano** (aplicam imediatamente e sincronizam datas dos blocos)
2. Range manual **De / Até** + **Aplicar**

Ao aplicar o global, **somente `start`/`end`** de cada bloco são atualizados. Tags e status locais permanecem.

O `group_by` da API deriva do preset:

| Preset | group_by |
|---|---|
| Dia / Semana / Mês | `day` |
| Ano | `month` |

## Abas

Associados · Serviços · Pedidos · Triagem — cada uma com seu conjunto de blocos (`analyticsLayout.js`).

## Filtros por bloco

Cada card tem ícone de filtro:

- Override de datas
- Status (quando aplicável)
- Tags (serviços / pedidos / triagem)

**Aplicar** no bloco dispara refetch só para o hash daquele filtro. Blocos com o mesmo hash compartilham a mesma resposta da API.

Indicadores:

- **Data própria** — datas divergem do global
- **Filtros locais** — status/tags preenchidos

**Restaurar global** — volta datas do período global e limpa status/tags do bloco.

## Fetch

```
abas + filtros dos blocos
  → agrupa por filterHash
  → GET /analytics/:section?…
  → cache em memória por `${tab}::${hash}`
  → cada bloco lê kpis/series/rankings da resposta compartilhada
```
