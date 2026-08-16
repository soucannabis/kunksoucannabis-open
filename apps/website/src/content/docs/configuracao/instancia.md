---
title: Instância e assistente
description: Configuração da instância no Admin e fluxo de install.
---

A primeira configuração da associação acontece no **Admin** (`apps/admin`), incluindo identidade da instância, parâmetros de operação e ativação de módulos.

Há um fluxo de **install** no Admin (e cobertura de testes e2e / API) para bootstrap da instância. Em desenvolvimento, o seed da API (`npm run seed:sample --prefix kunk-api`) popula dados de exemplo para exploração.

Configs persistidas em banco (`system_configs`) podem incluir valores sensíveis criptografados com `CONFIG_ENCRYPT_KEY`.

Para áreas do Admin (dados, configs, usuários), veja a documentação do app:

- [Admin — visão geral](/frontend/admin/)
- [Admin — fluxo](/frontend/admin/flow/)
- [Admin — API](/frontend/admin/api/)
