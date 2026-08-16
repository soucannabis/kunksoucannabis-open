---
title: Erros do sistema
description: Triagem de system_errors e contrato da API.
---

A API registra falhas operacionais em **system_errors**, consultáveis pelo Admin e pela API.

Documentação do contrato: [System errors (API)](/api/system-errors/).

No repositório há skill/fluxo interno de triagem (`.cursor/skills/kunk-system-errors`) para analisar grupos em aberto — use em desenvolvimento/ops com cuidado e **não marque erros como resolvidos sem aprovação**.
