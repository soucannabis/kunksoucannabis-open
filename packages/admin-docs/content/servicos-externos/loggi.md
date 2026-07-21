---
id: servicos-loggi
title: Loggi
section: servicos-externos
adminPath: /servicos-externos/loggi
keywords: [loggi, frete, cotação, etiqueta, tracking, oauth]
order: 92
---

## Para que serve

Integra a **Loggi** para cotar frete, gerar etiqueta e acompanhar rastreio nos pedidos.

## Credenciais (tokens)

Você precisa de **Client ID**, **Client Secret** e **Company ID** (OAuth da Loggi).

### Passo a passo

1. Acesse o portal [Loggi Empresas](https://www.loggi.com/empresas/) (ou homologação) com a conta da associação.
2. Peça ao time Loggi ou abra **API / integrações** e obtenha **Client ID**, **Client Secret** e **Company ID**.
3. Cole os valores na página do Admin. URL base padrão: `https://api.loggi.com`.
4. Clique em **Autenticar**.
5. Preencha [Dados de envio](/inicio/servicos-envio).
6. Ative o **módulo** e marque os usos: cotação, etiqueta e/ou tracking.

## Usos

| Uso | Efeito |
| --- | --- |
| Cotação | Calcula frete Loggi no checkout / pedidos |
| Etiqueta | Gera etiqueta de envio |
| Tracking | Consulta rastreio |

## Documentação oficial

- [API Loggi](https://docs.api.loggi.com/reference/nossa-documenta%C3%A7%C3%A3o)
- [Criar cotação](https://docs.api.loggi.com/reference/quote)
