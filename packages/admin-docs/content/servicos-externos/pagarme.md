---
id: servicos-pagarme
title: Pagar.me
section: servicos-externos
adminPath: /servicos-externos/pagarme
keywords: [pagarme, pagamento, psp, webhook, checkout, split]
order: 97
---

## Para que serve

Conecta o **Pagar.me** para cobranças, links de pagamento e (em conta PSP) split com Pedidos SouCannabis.

## Credenciais

**Secret Key** (`sk_…`) e **Public Key** (`pk_…`).

Os **webhooks** da Pagar.me **precisam de autenticação HTTP Basic**. Cadastre no painel da Pagar.me o mesmo usuário e senha definidos nesta tela. Sem Basic Auth a API responde **401** e o pagamento não é confirmado — não deixe o webhook anônimo.

### Passo a passo

1. Acesse o [Dashboard Pagar.me](https://dashboard.pagar.me/).
2. Em **Configurações → Chaves de API**, copie Secret e Public Key.
3. Cole no Admin → **Autenticar**. O sistema indica se a conta é **PSP** ou **Gateway**.
4. No passo **Webhooks**: salve usuário e senha no Admin. No Pagar.me, **Conta → Configurações → Webhooks → Criar webhook**, cole as URLs da tela, ative **HTTP Basic** com os mesmos valores e marque os eventos `order.created` e `order.paid`.
5. Conclua a validação pedida pela tela (link de teste + Validar webhooks).
6. Ative o módulo e o uso em pedidos/serviços.

## Documentação oficial

- [Introdução Pagar.me](https://docs.pagar.me/reference/introdu%C3%A7%C3%A3o-1)
- [Dashboard](https://dashboard.pagar.me/)
