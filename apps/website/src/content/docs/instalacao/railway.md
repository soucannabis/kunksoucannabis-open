---
title: Deploy no Railway
description: Suba uma instância completa do Kunk na Railway com um clique, pelo template oficial.
---

A [Railway](https://railway.com/) é a plataforma de nuvem usada para provisionar instâncias do Kunk em produção. Você não precisa montar servidor, Docker Compose nem DNS na mão: um template cria o projeto, o PostgreSQL e os apps, e publica URLs HTTPS.

## O que é a Railway

A Railway hospeda aplicações a partir de um repositório Git ou de uma imagem Docker. Ela faz o build, o deploy, a rede privada entre serviços e os domínios públicos. O modelo é simples:

| Conceito | Função |
|---|---|
| **Workspace** | Conta e faturamento (pessoal ou da equipe). |
| **Projeto** | Uma instância do Kunk: API, apps e banco no mesmo canvas. |
| **Ambiente** | Isolamento de config (por padrão, `production`). |
| **Serviço** | Uma unidade implantável (API, frontend ou Postgres). |
| **Deploy** | Um build publicado daquele serviço. |

## Template oficial

O template [Deploy Kunk Sou Cannabis Open Source](https://railway.com/deploy/52h9Cj) empacota o stack completo a partir do repositório [`soucannabis/kunksoucannabis-open`](https://github.com/soucannabis/kunksoucannabis-open):

| Serviço | Papel |
|---|---|
| **kunk-api** | API REST, sessões, arquivos e regras de negócio |
| **admin** | Área Admin (configuração e assistente de instalação) |
| **kunk-app** | Painel operacional (acolhimento, pedidos, relatórios) |
| **registration** | Cadastro de associados |
| **doc-sign** | Assinatura de termos |
| **Postgres** | Banco gerenciado, com volume persistente |

## Instalar com um clique

1. Tenha (ou crie na hora) uma conta na [Railway](https://railway.com/). O login pode ser com GitHub.
2. Clique no botão abaixo. Ele abre o template oficial.
3. Clique em **Deploy**. A Railway cria o projeto, sobe o Postgres e faz o build de cada app.

<a class="railway-deploy" href="https://railway.com/deploy/52h9Cj" target="_blank" rel="noopener noreferrer">
  <img src="https://railway.com/button.svg" alt="Deploy on Railway" width="185" height="40" />
</a>

:::note
O deploy inicial leva alguns minutos (vários serviços em paralelo). Acompanhe o status de cada serviço no canvas do projeto. Só use as URLs quando o deploy estiver em **Success**.
:::

## Custos e conta

A Railway cobra pelo uso (CPU, memória, volume do Postgres e outbound). Há trial e planos pagos; o valor depende do tamanho da instância. Veja [railway.com/pricing](https://railway.com/pricing).

Para desenvolvimento na máquina, continue com [setup local](/instalacao/setup-local/) ou [Deploy / Docker](/instalacao/deploy/).
