# Kunk — mapa de funcionalidades

> App operacional (`apps/kunk`, porta **4257**). Roles staff: Administrador, Acolhimento, Produção (+ portal Profissional).
> Índice: [README.md](./README.md)

**Auth:** operador (`system_users`).  
**Testes do app:** Vitest parcial (`npm run test:kunk`) + Playwright (`npm run test:e2e:kunk`).

## Auth e páginas públicas

| Módulo | Página | Descrição | Testes |
|---|---|---|---|
| Login | `/login` | Entrada de operador | e2e: Sim · Vitest: Parcial (redirect) |
| Nova senha | `/nova-senha` | Reset de senha | e2e: Não · API: Sim |
| Convite operador | `/cadastro` | Aceite de invite | e2e: Não · API: Não |
| Portal profissional | `/relatorio/servicos` | Relatório do próprio profissional | e2e: Não · API: Parcial |
| Fila pública | `/fila` | Fila de triagem pública | e2e: Sim · API: Sim (reception) |
| Não autorizado | `/unauthorized` | Sem permissão de página | e2e: Sim |
| Não conectado | `/not-connected` | Sem sessão / offline | e2e: Não |

## Acolhimento

| Módulo | Página | Descrição | Testes |
|---|---|---|---|
| Associados | `/app/acolhimento/cadastramento` | Lista e edição de associados | e2e: Sim · API: Sim |
| Serviços | `/app/acolhimento/servicos` | Agenda / serviços | e2e: Sim · API: Sim |
| Triagem | `/app/acolhimento/triagem` | Fila e atendimento | e2e: Sim · API: Sim |
| Clientes institucionais | `/app/acolhimento/clientesinstitucionais` | Empresas / CNPJ | e2e: Sim · API: Parcial |

## Loja

| Módulo | Página | Descrição | Testes |
|---|---|---|---|
| Pedidos | `/app/loja/pedidos` | Listagem, status, bulk, rastreio | e2e: Sim · API: Sim |
| Novo pedido (carrinho) | `/app/loja/novo-pedido` | Carrinho, frete, totais | e2e: Sim (smoke) · API: Parcial |
| Produtos | `/app/loja/produtos` | Catálogo, estoque, import CSV | e2e: Sim · API: Sim |

## Profissionais e relatórios

| Módulo | Página | Descrição | Testes |
|---|---|---|---|
| Profissionais | `/app/profissionais` | Cadastro e saldo de doação | e2e: Sim · API: Sim |
| Dashboard analytics | `/app/relatorios/dashboard` | Gráficos operacionais | e2e: Sim · Vitest: Parcial (período) · API: Sim |
| Relatório de serviços | `/app/relatorios/servicos` | Serviços / payable | e2e: Sim · API: Parcial |

## Sistema

| Módulo | Página | Descrição | Testes |
|---|---|---|---|
| Histórico | `/app/historico` | Activity / auditoria leve | e2e: Sim · API: Sim |
| Tags | `/app/tags` | Etiquetas reutilizáveis | e2e: Sim · API: Sim (items) |

## Shell e transversais

| Módulo | Página | Descrição | Testes |
|---|---|---|---|
| Menu / sidebar | `/app/*` | Seções e permissões por role | e2e: Sim · Vitest: Sim |
| Busca global | (header) | Search multi-entidade | e2e: Não · API: Sim |
| Limpar cache | (sidebar) | Invalidação de cache do app | e2e: Não · API: Sim |
| Storage cloud | (uploads) | Upload com bucket ativo | e2e: Sim |
| Web Vitals / error boundary | (transversal) | Telemetria e falhas UI | npm: Não · e2e: Não |
| Rotas / redirect por role | (router) | Home conforme papel | Vitest: Sim |

## Redirect legado

| De | Para |
|---|---|
| `/app/prescritores` | `/app/profissionais` |
