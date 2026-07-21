---
id: servicos-melhorenvio
title: Melhor Envio
section: servicos-externos
adminPath: /servicos-externos/melhorenvio
keywords: [melhor envio, correios, frete, oauth, etiqueta]
order: 93
---

## Para que serve

Integra o **Melhor Envio** (incluindo Correios e outras transportadoras do catálogo) para cotação, etiqueta e rastreio.

## Credenciais (OAuth)

Você cria um aplicativo no Melhor Envio e autoriza o Kunk via popup.

### Passo a passo

1. Acesse o [Melhor Envio](https://melhorenvio.com.br/) com a conta da loja / associação.
2. Em **Integrações → API** (ou “Meus aplicativos”), crie um app OAuth e copie **Client ID** e **Client Secret**.
3. Em URIs de redirecionamento, cole a **Redirect URI** mostrada na página do Admin (botão copiar).
4. Cole Client ID e Secret → **Autenticar** (abre a autorização no Melhor Envio).
5. Preencha [Dados de envio](/inicio/servicos-envio).
6. Ative o **módulo** e os usos desejados (cotação, etiqueta, tracking).

## Usos

Iguais à Loggi: cotação, etiqueta e tracking. Dados de envio incompletos bloqueiam cotação/etiqueta.

## Documentação oficial

- [Introdução API](https://docs.melhorenvio.com.br/reference/introducao-api-melhor-envio)
- [Autenticação](https://docs.melhorenvio.com.br/docs/autenticacao)
