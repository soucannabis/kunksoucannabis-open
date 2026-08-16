---
title: Requisitos
description: O que você precisa para rodar o Kunk.
---

## Software

- **Node.js** 18+ (recomendado a versão LTS atual do repositório)
- **npm** (workspaces do monorepo)
- **PostgreSQL** 14+ (schema alvo da API)
- **Docker** e Docker Compose (opcional, para o stack unificado)

## Contas / serviços externos (opt-in)

Módulos como Pagar.me, Loggi, Melhor Envio, Google Calendar e Utalk são **desabilitados por padrão** e só entram quando configurados no Admin (e credenciais). Não são necessários para subir o núcleo.

## Portas locais usuais

| Serviço | Porta típica |
|---|---|
| Cadastro de Associados | `4255` |
| Assinatura de termos | `4258` |
| App Kunk | `4257` |
| Área Admin | `4256` |
| kunk-api (Docker) | `4250` |
| kunk-api (npm) | `8056` |
| Website (docs) | `4260` |

Próximo passo: [Setup local](/instalacao/setup-local/).
