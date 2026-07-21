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

**Secret Key** (`sk_…`) e **Public Key** (`pk_…`), além de usuário/senha de webhooks quando solicitado.

### Passo a passo

1. Acesse o [Dashboard Pagar.me](https://dashboard.pagar.me/).
2. Em **Configurações → Chaves de API**, copie Secret e Public Key.
3. Cole no Admin → **Autenticar**. O sistema indica se a conta é **PSP** ou **Gateway**.
4. Configure webhooks e URLs de sucesso / recebedores conforme o onboarding na tela.
5. Conclua os passos de validação pedida pela tela (chaves, link de teste, webhooks).
6. Ative o módulo e o uso em pedidos/serviços.

## Documentação oficial

- [Introdução Pagar.me](https://docs.pagar.me/reference/introdu%C3%A7%C3%A3o-1)
- [Dashboard](https://dashboard.pagar.me/)
