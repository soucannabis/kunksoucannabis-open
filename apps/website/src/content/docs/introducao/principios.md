---
title: Princípios
description: Como o produto é organizado e o que guia a arquitetura.
---

## Um produto unificado

Não são sistemas separados colados: é uma instância com API única (`kunk-api`), schema PostgreSQL próprio e frontends no monorepo (`apps/*`).

## Aplicações com papéis definidos

O **Cadastro de Associados** atende a adesão e o acompanhamento. A **Assinatura de termos** registra documentos digitais. O **Kunk** apoia a operação diária. A **Área Admin** configura a instância. A **API** conecta todos eles com autenticação, dados, regras de negócio, arquivos e integrações. A navegação e a autenticação respeitam esses papéis.

## Documentação como contrato

A pasta `project-tools/docs/` (sincronizada neste site) descreve fluxos, campos, API e gaps por módulo. O site público espelha essa documentação técnica.

## Open source operacional

Prioridade: instalação compreensível, configuração no Admin, módulos externos opt-in (frete, pagamentos, calendário, etc.) e operação sem ferramentas proprietárias obrigatórias além do banco e do stack da aplicação.
