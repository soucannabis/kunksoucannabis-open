# Frontends — Visão geral

> Documentação das superfícies de UI do produto Kunk unificado.
> Alinha ao [MANIFESTO.md](../../../MANIFESTO.md) §3.2–3.3 e §4.

## Objetivo

Recriar os frontends sobre a **nova API** (`kunk-api`) e o **schema alvo**, sem Directus no cliente.

O legado (`src/` painel, `cadastramento/`) permanece como **referência funcional e visual** até o cutover. A lógica de negócio do cadastramento está validada em produção (>3000 cadastros) — preservar comportamento; modernizar código, campos e layout.

## Apps do produto

| App | Pasta alvo (proposta) | Subdomínio | Porta dev | Prioridade |
|---|---|---|---|---|
| **Cadastramento** | `apps/registration/` | `cad.` | 4255 | **1 — primeiro frontend** |
| **Admin** | `apps/admin/` | `admin.` | 4256 | **2 — admin da instância** |
| **Kunk** | `apps/kunk/` | `app.` | 4257 | **3 — app operacional** ([kunk/](./kunk/)) |
| **Doc-sign** | `apps/doc-sign/` | `termos.` | 4258 | 4 — termos/assinaturas nativos ([doc-sign/](./doc-sign/)) |

Cada app é um **entrypoint** independente (build/deploy próprio), mas compartilha pacotes do monorepo. Não são produtos nem APIs separados.

O **admin** é a superfície de administração da instância (CRUD de dados, `system_configs`, operadores/permissões). O **Kunk** (`apps/kunk`) é o app operacional (acolhimento, pedidos, etc.). Ver [admin/](./admin/) e [kunk/](./kunk/).

## O que é compartilhado vs. específico

| Compartilhado (`packages/`) | Específico por app |
|---|---|
| Cliente HTTP da `kunk-api` | Rotas e páginas |
| Auth de sessão (cookie) | Fluxos de negócio |
| Tokens de tema / branding da associação | Layout (sidebar de progresso vs. dashboard) |
| Componentes de formulário reutilizáveis | Copy e CTAs |
| Utilitários (máscaras, CPF, telefone) | Integração doc-sign (fase 4 do cadastro) |

## Relação com a API

Todos os apps browser usam:

- Base: `/api/v1`
- Auth: cookie `session_token` (HttpOnly)
- Collections e rotas de domínio documentadas em [`../api/`](../api/)

O cadastramento precisa de **auth de associado** (`users`), distinta da auth de operador (`system_users`) do painel. Essa auth é entregue **junto com o app de cadastramento**. Ver [cadastramento/api.md](./cadastramento/api.md) e [cadastramento/gaps.md](./cadastramento/gaps.md).

## Índice desta pasta

| Documento | Conteúdo |
|---|---|
| [structure.md](./structure.md) | Estrutura de monorepo e pacotes |
| [theming.md](./theming.md) | Branding por associação (env + tokens) |
| [cadastramento/](./cadastramento/) | App de cadastro de associados (detalhe) |
| [admin/](./admin/) | App de administração da instância (dados, configs, operadores) |
| [kunk/](./kunk/) | App operacional Kunk + inventário de páginas do legado |
| [doc-sign/](./doc-sign/) | Termos de adesão e assinaturas (substitui DocuSeal) |

## Fonte legada

| App | Código atual | Notas |
|---|---|---|
| Cadastramento | [`cadastramento/`](../../../cadastramento/) | React + Vite + Bootstrap; campos Directus antigos |
| Kunk (operacional) | [`kunksoucannabis/src/`](../../../kunksoucannabis/src/) → [`apps/kunk/`](../../../apps/kunk/) | React + Vite + MUI Joy; docs em [kunk/](./kunk/) |
| BFF legado | [`kunksoucannabis/kunkserver/`](../../../kunksoucannabis/kunkserver/) | Proxy Directus + integrações |
