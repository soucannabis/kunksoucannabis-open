---
id: webmaster-webhooks
title: Webhooks
section: webmaster
adminPath: /webhooks
keywords: [webhooks, outbound, integração, hmac, eventos, n8n]
order: 86
---

## Para que serve

Notifica **sua API** (ou um fluxo n8n/Make) quando registros mudam no Kunk. Diferente de [Serviços externos](/inicio/servicos-externos), aqui você define a URL e escolhe **quais tabelas** e **quais ações** disparam o POST.

## O que você configura

Para cada webhook:

- **Nome** e **URL** HTTPS (ou HTTP em ambientes locais)
- **Tabelas** (v1): associados (`users`), pedidos (`orders`), serviços (`services`), triagem (`reception`)
- **Ações:** criar, atualizar, excluir
- **Ativo / pausado**
- **Secret** (mostrado só na criação ou ao rotacionar) — use para validar o header `X-Kunk-Signature`

Você pode cadastrar **vários** webhooks com combinações distintas.

## Fluxo recomendado

1. Crie o webhook e copie o secret imediatamente.
2. Clique em **Testar** e confira o POST na sua URL.
3. Abra **Execuções** para ver status (`pending`, `delivered`, `failed`, `dead`) e tentativas.
4. Em produção, valide a assinatura HMAC (`sha256` sobre `timestamp.body`).

## Entrega e retries

Os eventos não bloqueiam a tela do operador: entram numa fila (outbox) no Postgres e um worker envia em background, com backoff e até 8 tentativas.

## Documentação técnica

Contrato HTTP, headers e payload: `docs/api/modules/webhooks.md` no repositório.
