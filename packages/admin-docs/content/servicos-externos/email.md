---
id: servicos-email
title: E-mail (SMTP)
section: servicos-externos
adminPath: /servicos-externos/email
keywords: [email, smtp, correio, notificação, mail]
order: 96
---

## Para que serve

Configura o **envio de e-mails** do sistema (avisos, testes, mensagens transacionais) via servidor SMTP da associação.

## Credenciais

Host, porta, usuário, senha (ou senha de app), e-mail remetente e nome.

### Passo a passo

1. Escolha o provedor SMTP (Gmail, Outlook, SES, SendGrid, servidor próprio, etc.).
2. No painel do provedor, ative SMTP e anote host, porta (587 ou 465), usuário e senha.
3. Preencha os campos no Admin; marque **TLS implícito** se a porta for 465.
4. Clique em **Autenticar** (teste VERIFY) — o **módulo** é ativado automaticamente se o teste passar.
5. Opcionalmente envie um **e-mail de teste**.

## Documentação de referência

- [Nodemailer SMTP](https://nodemailer.com/smtp/)
