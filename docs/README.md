# Documentação — Kunk Open Source

Índice da documentação técnica do produto unificado.

## Áreas

| Área | Pasta |
|---|---|
| **Mapa de funcionalidades** | [`funcionalidades/`](./funcionalidades/) |
| **API** | [`api/`](./api/) |
| **Frontends (apps)** | [`frontend/`](./frontend/) |

## Um produto, uma API, um banco

Superfícies distintas por subdomínio/porta:

| Subdomínio | App | Público |
|---|---|---|
| `cad/` | Cadastramento (`apps/registration`) | Associados em onboarding |
| `admin/` | Admin da instância (`apps/admin`) | Operadores com role `Administrador` |
| `app/` | Painel operacional (`apps/kunk`) | Operadores (`system_users`) |
| `termos/` | Doc-sign (`apps/doc-sign`) | Associados + operadores |

## Leitura sugerida

1. [`frontend/`](./frontend/) — visão das apps e estrutura do monorepo
2. [`api/`](./api/) — contrato e módulos da API
3. Specs por domínio em `frontend/kunk/` (triagem, pedidos, serviços, etc.)
