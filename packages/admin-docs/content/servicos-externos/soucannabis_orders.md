---
id: servicos-soucannabis
title: Pedidos SouCannabis
section: servicos-externos
adminPath: /servicos-externos/soucannabis_orders
keywords: [soucannabis, pedidos, sync, oauth, produtos, tags]
order: 98
---

## Para que serve

Sincroniza **produtos, tags e pedidos** com a API de Pedidos SouCannabis e, quando necessário, trabalha com split via Pagar.me PSP.

## Credenciais

Fornecidas pelo **time SouCannabis** (não há self-service público): base URL, Client ID, Client Secret e Token URL (se aplicável).

### Passo a passo

1. Solicite acesso à integração Kunk ↔ SouCannabis.
2. Receba `base_url`, Client ID, Client Secret (e Token URL se houver).
3. Cole no Admin → **Autenticar** (OAuth client_credentials + validação `/me`).
4. Se houver pedidos com valor e split, configure também o [Pagar.me](/inicio/servicos-pagarme) em modo **PSP** e recipients / percentual.
5. Ative o módulo e os usos de sincronização desejados (produtos, tags, pedidos).

## Observação

Sem credenciais do time SouCannabis não é possível “gerar token” sozinho no site deles — o processo é coordenado com o suporte.
