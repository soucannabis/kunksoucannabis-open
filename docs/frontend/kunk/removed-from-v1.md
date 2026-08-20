# Páginas e seções removidas do Kunk v1

> Estas rotas/seções existiam no legado (`kunksoucannabis`) mas **não** entram no app operacional `apps/kunk` nesta primeira entrega.
> Motivo: fora do escopo inicial, migradas para outro app, ou específicas SouCannabis.

App operacional: [`apps/kunk`](../../../../apps/kunk) · Inventário legado completo: [pages/](./pages/)

## Removidas do menu / rotas v1

| Item legado | Rota legada | Destino / nota OSS |
|---|---|---|
| **Dashboard (seção)** | — | Seção inteira removida do app operacional |
| Painel geral | `/app/painel-analise` | Analytics institucional — fora do v1 |
| Beeviral Analytics | `/app/beeviral-analytics` | Afiliados SC — fora do v1 |
| Webmaster | `/app/webmaster` | Observabilidade — futuro / ops |
| Nibo Dashboard | `/app/nibo-dashboard` | Módulo financeiro externo — opcional futuro |
| Pesquisa de satisfação | `/app/acolhimento/pesquisas-satisfacao` | Fora do acolhimento v1; reavaliar depois |
| Matérias-primas | `/app/loja/materias-primas` | Estoque/produção — futuro módulo |
| Serviço Social (seção) | — | Seção inteira removida |
| Cupons | `/app/servico-social/cupons` | Serviço social / admin futuro |
| Relatórios (seção) | `/app/relatorios*`, `/app/dashboard(s)` | Analytics SQL — fase posterior |
| Relatórios Pagamentos / Sou Analytics | filhos da seção Relatórios | Idem |
| Usuários (seção) | `/app/usuarios` | Coberto por [`apps/admin`](../../../../apps/admin) `/usuarios` |

## Também fora do menu v1 (sem rota no app novo)

| Item | Nota |
|---|---|
| Financeiro lançamentos/relatório | Não estava no menu principal filtrado desta entrega |

## Docs de página legada

Os arquivos em [pages/](./pages/) permanecem como inventário do sistema antigo. Onde a decisão for “fora do v1”, use esta lista como fonte da verdade do escopo do `apps/kunk`.
