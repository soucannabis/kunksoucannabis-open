# Kunk — Documentação das páginas (legado + app novo)

> Inventário funcional das rotas do frontend legado (`kunksoucannabis`) e escopo do app operacional **`apps/kunk`** (porta **4257**).
>
> Fonte de rotas legadas: `kunksoucannabis/src/App.jsx` + `theme.jsx`.
> Implementação nova: [`apps/kunk`](../../../../apps/kunk).
> Remoções do v1: [removed-from-v1.md](./removed-from-v1.md).

## Posicionamento

```
subdomínio app./     →  apps/kunk (:4257)
         │
         ▼
    kunk-api /v1
         │
         ▼
    PostgreSQL
```

Referência legada: [`kunksoucannabis/`](../../../../kunksoucannabis/) + [`kunksoucannabis/kunkserver/`](../../../../kunksoucannabis/kunkserver/).

## Páginas principais (prioridade de revisão)

| Página | Rota | Doc |
|---|---|---|
| Cadastramento / Associados | `/app/acolhimento/associados` | [pages/cadastramento.md](./pages/cadastramento.md) · **[spec implementação](./associados/README.md)** |
| Triagem | `/app/acolhimento/triagem` | [pages/triagem.md](./pages/triagem.md) · **[spec implementação](./triagem/README.md)** |
| Pedidos | `/app/loja/pedidos` | [pages/pedidos.md](./pages/pedidos.md) · **[spec carrinho/frete](./pedidos/README.md)** · **[Pagar.me + Pedidos SC](./pagamentos-soucannabis/README.md)** |
| Serviços | `/app/acolhimento/servicos` | [pages/servicos.md](./pages/servicos.md) · **[spec implementação](./servicos/README.md)** |
| Relatório de serviços | `/app/relatorios/servicos` | [pages/relatorios-servicos.md](./pages/relatorios-servicos.md) · **[spec implementação](./relatorios-servicos/README.md)** |
| Dashboard Analytics | `/app/relatorios/dashboard` | [pages/painel-analise.md](./pages/painel-analise.md) · **[spec implementação](./analytics/README.md)** |
| Search global | shell `/app/*` | **[spec implementação](./search-global/README.md)** |

## Índice completo por área


### Páginas principais

| Página | Rota | Doc |
|---|---|---|
| Cadastramento (associados) | `/app/acolhimento/associados` | [pages/cadastramento.md](./pages/cadastramento.md) · [associados/](./associados/README.md) |
| Triagem / acolhimento | `/app/acolhimento/triagem` | [pages/triagem.md](./pages/triagem.md) · [triagem/](./triagem/README.md) |
| Pedidos | `/app/loja/pedidos` | [pages/pedidos.md](./pages/pedidos.md) · [pedidos/](./pedidos/README.md) · [pagamentos-soucannabis/](./pagamentos-soucannabis/README.md) |
| Serviços | `/app/acolhimento/servicos` | [pages/servicos.md](./pages/servicos.md) · [servicos/](./servicos/README.md) |
| Relatório de serviços | `/app/relatorios/servicos` + `/relatorio/servicos` | [pages/relatorios-servicos.md](./pages/relatorios-servicos.md) · [relatorios-servicos/](./relatorios-servicos/README.md) |
| Dashboard Analytics | `/app/relatorios/dashboard` | [pages/painel-analise.md](./pages/painel-analise.md) · [analytics/](./analytics/README.md) |
| Search global | FAB no shell | [search-global/](./search-global/README.md) |

### Shell e auth

| Página | Rota | Doc |
|---|---|---|
| Shell Theme (`/app/*`) | `/app/*` | [pages/theme-shell.md](./pages/theme-shell.md) · [search-global/](./search-global/README.md) |
| Home / redirecionamento | `/` | [pages/home-redirect.md](./pages/home-redirect.md) |
| Login | `/login` | [pages/login.md](./pages/login.md) |
| Cadastro de usuário do sistema (convite) | `/cadastro` | [pages/cadastro-usuario-sistema.md](./pages/cadastro-usuario-sistema.md) |
| Redefinição de senha | `/nova-senha` | [pages/nova-senha.md](./pages/nova-senha.md) |
| Não autorizado | `/nao-autorizado` | [pages/nao-autorizado.md](./pages/nao-autorizado.md) |
| Não conectado | `/nao-conectado` | [pages/nao-conectado.md](./pages/nao-conectado.md) |
| Página não encontrada (404) | `* (catchall)` | [pages/not-found.md](./pages/not-found.md) |

### Acolhimento

| Página | Rota | Doc |
|---|---|---|
| Associados (lista completa) | `/app/associados` | [pages/associados.md](./pages/associados.md) · [associados/](./associados/README.md) |
| Clientes institucionais | `/app/acolhimento/clientesinstitucionais` | [pages/clientes-institucionais.md](./pages/clientes-institucionais.md) · [clientes-institucionais/](./clientes-institucionais/README.md) |
| Pesquisas de satisfação | `/app/acolhimento/pesquisas-satisfacao` | [pages/pesquisas-satisfacao.md](./pages/pesquisas-satisfacao.md) |
| Triagem (rota top-level) | `/triagem` | [pages/triagem-top-level.md](./pages/triagem-top-level.md) |

### Loja

| Página | Rota | Doc |
|---|---|---|
| Produtos | `/app/loja/produtos` | [pages/produtos.md](./pages/produtos.md) |
| Matérias-primas | `/app/loja/materias-primas` | [pages/materias-primas.md](./pages/materias-primas.md) |
| Novo pedido (carrinho / checkout) | `/app/loja/novo-pedido` | [pages/novo-pedido.md](./pages/novo-pedido.md) · **[spec](./pedidos/README.md)** |
| Carrinho (rota top-level) | `/cart` | [pages/cart-top-level.md](./pages/cart-top-level.md) — **não portar** (unificar com novo-pedido) |

### Prescritores e cupons

| Página | Rota | Doc |
|---|---|---|
| Prescritores | `/app/prescritores` | [pages/prescritores.md](./pages/prescritores.md) — gestão OSS em [servicos/](./servicos/README.md) (`/app/profissionais`) |
| Cupons (serviço social) | `/app/servico-social/cupons` | [pages/cupons.md](./pages/cupons.md) |
| Relatório de pedidos (externo) | `/relatorio/pedidos` | [pages/relatorio-pedidos-externo.md](./pages/relatorio-pedidos-externo.md) |
| Relatório de serviços (externo) | `/relatorio/servicos` | [pages/relatorio-servicos-externo.md](./pages/relatorio-servicos-externo.md) · **[spec](./relatorios-servicos/README.md)** |
| Relatórios — pedidos (staff) | `/app/relatorios/pedidos` | [pages/relatorios-pedidos.md](./pages/relatorios-pedidos.md) — **fora do escopo v1 serviços** |
| Relatórios — serviços (staff) | `/app/relatorios/servicos` | [pages/relatorios-servicos.md](./pages/relatorios-servicos.md) · **[spec](./relatorios-servicos/README.md)** |

### Financeiro e integrações

| Página | Rota | Doc |
|---|---|---|
| Financeiro — lançamentos | `/app/financeiro/lancamentos` | [pages/financeiro-lancamentos.md](./pages/financeiro-lancamentos.md) |
| Financeiro — relatório | `/app/financeiro/relatorio` | [pages/financeiro-relatorio.md](./pages/financeiro-relatorio.md) |
| Nibo Dashboard | `/app/nibo-dashboard/*` | [pages/nibo-dashboard.md](./pages/nibo-dashboard.md) |
| Beeviral Analytics | `/app/beeviral-analytics` | [pages/beeviral-analytics.md](./pages/beeviral-analytics.md) |

### Relatórios e dashboards

| Página | Rota | Doc |
|---|---|---|
| Relatórios (catálogo) | `/app/relatorios` | [pages/relatorios.md](./pages/relatorios.md) |
| Novo / editar relatório | `/app/novo-relatorio` | [pages/novo-relatorio.md](./pages/novo-relatorio.md) |
| Dashboards (lista) | `/app/dashboards` | [pages/dashboards.md](./pages/dashboards.md) |
| Dashboard (editor/viewer) | `/app/dashboard` | [pages/dashboard.md](./pages/dashboard.md) |
| Painel de análise institucional | `/app/painel-analise` | [pages/painel-analise.md](./pages/painel-analise.md) |
| Painel de análise — ver dados | `/app/painel-analise/ver-dados` | [pages/painel-analise-ver-dados.md](./pages/painel-analise-ver-dados.md) |

### Sistema

| Página | Rota | Doc |
|---|---|---|
| Usuários do sistema | `/app/usuarios` | [pages/usuarios.md](./pages/usuarios.md) |
| Atualizações (changelog) | `/app/atualizacoes` | [pages/atualizacoes.md](./pages/atualizacoes.md) |
| Webmaster (observabilidade) | `/app/webmaster` | [pages/webmaster.md](./pages/webmaster.md) |

## Integrações externas (visão geral)

Módulos de terceiros devem vir **desabilitados por padrão** no OSS (princípio OSS (§3.6)):

| Integração | Páginas típicas | Notas OSS |
|---|---|---|
| Directus (legado) | Quase todas | Substituir por `kunk-api` + PostgreSQL |
| DocuSeal | Cadastramento (contrato) | Substituir por módulo termos nativo |
| Utalk / WhatsApp | Triagem, pedidos, serviços, relatórios, pesquisas | Módulo opcional |
| Pagar.me | Novo pedido, serviços | Módulo opcional — [pagamentos-soucannabis/](./pagamentos-soucannabis/README.md) |
| Pedidos SouCannabis | Carrinho (catálogo/tags) + sync pós-pago + split | Requer Pagar.me — [pagamentos-soucannabis/](./pagamentos-soucannabis/README.md) |
| Loggi / Melhor Envio | Pedidos, novo pedido | Módulo opcional |
| Google Calendar | Serviços | Módulo opcional |
| Beeviral (+ Analytics) | Pedidos, triagem, painel | Candidato a remover (SC) |
| Nibo | Nibo Dashboard | Módulo opcional |
| BrasilNFe | Pedidos | Módulo opcional / fiscal BR |
| Geoapify | Pedidos | Módulo opcional |
| SCP (estoque) | Produtos, matérias-primas, pedidos | Avaliar genérico vs SC |
| Cora (+ S3) | Financeiro lançamentos | Módulo bancário / SC |
| E-mail SMTP | Auth, usuários, pesquisas, triagem | Core (configurável) |
| Observabilidade PG | Webmaster | Core ops |

## Princípios desta pasta

| Fazer | Não fazer |
|---|---|
| Documentar o comportamento **real** do legado | Inventar features novas nestes arquivos |
| Marcar integrações e acoplamentos SC | Assumir que tudo vai para o OSS |
| Usar cada MD como checklist de escopo | Implementar páginas antes da revisão |
| Preservar layout Theme 1:1 na recriação | Redesign do shell sem decisão explícita |

## Status

`documentado` — inventário das rotas do frontend legado pronto para revisão de escopo.
