---
id: servicos-externos
title: Serviços externos — visão geral
section: servicos-externos
adminPath: /servicos-externos
keywords: [integrações, módulos, tokens, credenciais, oauth, api, ativação]
order: 90
---

## Para que serve

Aqui você conecta o Kunk a **empresas e ferramentas de fora** (frete, pagamento, e-mail, WhatsApp, mapa, agenda). Cada serviço tem a própria página com formulário e um guia “Como obter as credenciais”.

## Módulo ativo × ativação de usos

Em quase todos os serviços você verá dois níveis:

1. **Módulo ativo** — liga ou desliga o serviço no sistema. Com o módulo desligado, o Kunk não usa aquela integração (mesmo que as chaves estejam salvas).
2. **Usos** (checkboxes filhos) — dizem *para que* o módulo serve quando está ligado. Exemplos:
   - Frete: cotação, etiqueta, rastreio
   - Geoapify: usar na verificação de endereço
   - Google Calendar: usar no agendamento
   - Pedidos SouCannabis: sincronizar produtos, tags ou pedidos

Os usos **só fazem sentido com o módulo ligado**. A interface mostra essa árvore para evitar ativar um uso sem o serviço estar disponível.

## Como obter tokens e credenciais

Cada provedor entrega chaves de forma diferente (Client ID/Secret, API Key, senha SMTP, etc.). O fluxo geral é:

1. Abra a conta no **site do fornecedor** (links nos artigos abaixo).
2. Crie ou copie as **credenciais / tokens** no painel deles.
3. Cole no Admin e clique em **Autenticar** — o Kunk grava e testa. Segredos **não voltam a aparecer** depois de salvos (só um indicador de que já existem).
4. Preencha dados extras se a tela pedir (ex.: [Dados de envio](/inicio/servicos-envio) para frete).
5. Ative o **módulo** e marque os **usos** desejados.

> Dica: “token” aqui significa a chave que o fornecedor dá para o Kunk falar com a API dele — não é a senha do seu login do Admin.

## Ordem recomendada

```
Credenciais → Autenticar → Dados necessários → Módulo ativo → Usos
```

## Serviços disponíveis

| Serviço | Artigo |
| --- | --- |
| Dados de envio (remetente) | [Dados de envio](/inicio/servicos-envio) |
| Loggi | [Loggi](/inicio/servicos-loggi) |
| Melhor Envio | [Melhor Envio](/inicio/servicos-melhorenvio) |
| Validador de endereço (Geoapify) | [Geoapify](/inicio/servicos-geoapify) |
| Google Calendar | [Google Calendar](/inicio/servicos-google-calendar) |
| E-mail (SMTP) | [E-mail](/inicio/servicos-email) |
| Pagar.me | [Pagar.me](/inicio/servicos-pagarme) |
| Pedidos SouCannabis | [Pedidos SouCannabis](/inicio/servicos-soucannabis) |
| Utalk (WhatsApp) | [Utalk](/inicio/servicos-utalk) |
| Armazenamento em nuvem | [Armazenamento](/inicio/configuracoes-armazenamento) |

## Documentação técnica (desenvolvedores)

A especificação interna da API Kunk para cada módulo fica em `project-tools/docs/api/modules/` no repositório. No dia a dia do Admin, use os guias desta central e os links oficiais de cada fornecedor.
