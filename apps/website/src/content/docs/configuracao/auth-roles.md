---
title: Auth e papéis
description: Sessões, associados, system_users e autorização.
---

A API nativa autentica sessões via cookies e aplica autorização por papel/recurso.

Conceitos principais:

- **Associados** — usuários do cadastro / vínculo com a associação
- **system_users** — operadores do painel Kunk e Admin
- **Papéis** — controlam menus e endpoints (ex.: Administrador)

Documentação de contrato:

- [Autenticação](/api/authentication/)
- [Autorização](/api/authorization/)

Nos frontends, pacotes compartilhados (`@kunk/auth-session`, `@kunk/ui`) concentram login e sessão pública.
