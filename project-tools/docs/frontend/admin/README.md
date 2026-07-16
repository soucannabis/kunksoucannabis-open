# Admin — Documentação do app

> Painel de **administração da instância** (dados, configs e operadores).
> Superfície distinta do painel operacional (`app.`) e do cadastramento (`cad.`).
> Faz parte da mesma instalação unificada — mesma API, mesmo banco, porta/subdomínio próprios.

## Objetivo

Criar um app de administração que permita à associação (ou ao operador com papel admin):

1. **Editar dados do banco** — CRUD completo nas collections da whitelist, navegação por FKs, visualização de arquivos
2. **Gerir `system_configs`** — variáveis e configurações de todos os sistemas da instância, agrupadas por `system`
3. **Gerir operadores e permissões** — criar, editar e excluir `system_users`; definir roles (`permissions`)
4. **Configurar triagem** — formulário público, statuses e módulos (ver [`../kunk/triagem/`](../kunk/triagem/README.md))
5. **Aparência do Kunk** — logo, título, tema (`/aparencia`)
6. **Loja e serviços externos** — frete no carrinho, enable Loggi/Melhor Envio, assistente de API keys (ver [`../kunk/pedidos/`](../kunk/pedidos/README.md))

## Fora de escopo (neste app)

- Fluxos operacionais de acolhimento, produção, pedidos, etc. → isso é o **painel** (`apps/panel` / `app.`)
- Funil público de associados → **cadastramento** (`apps/registration` / `cad.`)
- Assinatura de termos → **doc-sign** (`apps/doc-sign` / `termos.`)
- Clone de features Directus (flows, revisions, SQL livre do cliente)

## Índice

| Documento | Conteúdo |
|---|---|
| [flow.md](./flow.md) | Áreas do app, guards de acesso, navegação |
| [api.md](./api.md) | Contratos de API necessários ao admin |
| [gaps.md](./gaps.md) | Decisões fechadas + checklist da entrega |

## Posicionamento no produto

```
subdomínio admin./     →  este app (admin)     porta dev :4256
subdomínio app./       →  painel operacional   (futuro)
subdomínio cad./       →  cadastramento        porta dev :4255
subdomínio termos./    →  doc-sign             (spec: ../doc-sign/)
         │
         ▼
    kunk-api /v1  ←── mesma API de todos os apps
         │
         ▼
    PostgreSQL (schema alvo + system_configs)
```

Uma **instalação** = um produto. Cada superfície é um entrypoint (build/deploy/porta ou subdomínio), não um sistema separado.

## Princípios

| Fazer | Não fazer |
|---|---|
| Reusar auth de operador (`system_users` + cookie `session_token`) | Inventar um terceiro canal de auth |
| Exigir role **`Administrador`** para entrar e para mutações sensíveis | Abrir o admin a Acolhimento / Produção / etc. |
| CRUD via `/items/:collection` + rotas de domínio já existentes | Expor SQL arbitrário do browser |
| Configs via endpoints admin de `system_configs` (criptografia no server) | Gravar secrets em plaintext no front ou no bundle |
| Extrair cliente HTTP / sessão para `packages/` | Silo só de admin sem reuso |

## Status desta documentação

`in progress` — implementação de `apps/admin` alinhada a este documento.
