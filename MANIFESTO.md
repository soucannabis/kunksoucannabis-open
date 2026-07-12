# Manifesto — Kunk Open Source

> Documento de intenção do projeto.
> Não descreve implementação detalhada nem cronograma técnico.
> Documentação por área e implementação real virão em fases posteriores.

---

## 1. Origem

Este repositório é a base de um novo projeto **open source**, derivado do sistema em produção da associação de cannabis medicinal **SouCannabis**.

O sistema original é interno, testado e validado para gerenciamento de associados. A estrutura atual combina:

| Componente | Papel | Tipo |
|---|---|---|
| **Directus** | Gerenciamento de banco de dados e API de conexão | Open source de terceiros |
| **DocuSeal** | Criação e assinatura de termos de responsabilidade | Open source de terceiros |
| **Kunksoucannabis** | Gerenciamento de associados (painel interno) | Projeto próprio |
| **Cadastramento** | Cadastro de associados (outro subdomínio) | Projeto próprio |

A intenção deste novo projeto é **transformar essa estrutura em uma solução open source unificada**, compartilhada com outras associações, **sem depender de Directus nem DocuSeal**, com instalação simples e opção de provisionamento via SaaS.

---

## 2. Visão

Criar uma **plataforma unificada** de gestão associativa para cannabis medicinal que:

1. Rode sobre **PostgreSQL** nativo (sem Directus).
2. Inclua **gerenciamento de termos e assinaturas** nativo (sem DocuSeal).
3. Unifique **painel interno + cadastro público** no mesmo produto, em subdomínios distintos.
4. Ofereça **instalação completa** no estilo WordPress/Mautic (assistente web e/ou terminal).
5. Possa ser provisionada em escala por um **SaaS de gestão de instâncias**, usando [Railway](https://railway.com/) como infraestrutura de deploy.

O usuário final (associação) deve conseguir instalar o projeto completo de forma previsível, configurar módulos de terceiros quando precisar, e operar sem depender de ferramentas externas obrigatórias além do banco e do próprio stack da aplicação.

---

## 3. Objetivos principais

### 3.1 Remover Directus — PostgreSQL + API própria

- Manter apenas o banco **PostgreSQL**.
- Corrigir nomes de campos/tabelas criados em inglês com texto incorreto.
- Reconstruir relações reais entre tabelas via **chaves estrangeiras** (hoje há conexões lógicas entre campos distintos, mediadas pelo Directus).
- Refazer o **kunkserver** como API REST robusta, conectada ao novo banco:
  - Baseada no servidor atual.
  - Rotas reorganizadas de forma profissional e padronizada.

### 3.2 Remover DocuSeal — termos nativos no produto

- Criar um **gerenciador de termos e assinaturas** dentro do ecossistema Kunksoucannabis.
- Manter as mesmas funcionalidades essenciais observadas no DocuSeal (instalação local de referência permitida para estudo do fluxo).
- O módulo faz parte do produto unificado, porém é **exibido em subdomínio próprio**.

### 3.3 Incorporar Cadastramento

- Incorporar o frontend de **Cadastramento** em Kunksoucannabis.
- Exibir o cadastro público em **subdomínio diferente**.
- Preservar a lógica de cadastro de associados do projeto original.
- Unificar **cadastramento-server** dentro do **kunkserver** (uma única API).

### 3.4 Instalação unificada (self-hosted)

Base única, sem dependência obrigatória de outros open sources para o núcleo:

- Assistente de instalação **frontend** (similar a WordPress/Mautic).
- Guia de instalação.
- Arquivo **JSON** com todas as configurações necessárias.
- Dois modos de instalação:
  - **Via navegador** (assistente).
  - **Via terminal** (instalação limpa com JSON preenchido).
- Suporte a instalação **com Docker** e **sem Docker**.

### 3.5 SaaS de provisionamento de instâncias

Criar um projeto SaaS separado que:

- Permite ao usuário criar uma **nova instância** completa do sistema.
- Gerencia a instalação ponta a ponta.
- Usa **[Railway](https://railway.com/)** para deploy (templates Docker, domínios, API, CLI e Agents).

O SaaS orquestra; a aplicação open source permanece instalável de forma independente.

### 3.6 Módulos de terceiros desabilitados por padrão

Integrações como **Loggi**, **Pagar.me**, **Google Calendar** (e demais existentes) devem:

- Vir **desabilitadas** na instalação padrão.
- Poder ser ativadas pelo usuário em uma **página de módulos** no Kunksoucannabis.
- Também poder ser ativadas via **variáveis de ambiente**, quando as credenciais necessárias estiverem definidas.

---

## 4. Arquitetura-alvo (visão lógica)

```
                    ┌─────────────────────────────────┐
                    │     SaaS (provisionamento)      │
                    │         via Railway             │
                    └────────────────┬────────────────┘
                                     │ cria instâncias
                                     ▼
┌──────────────────────────────────────────────────────────────┐
│                 Instância Kunk (produto unificado)           │
│                                                              │
│  subdomínio app/  →  Painel Kunksoucannabis                  │
│  subdomínio cad/  →  Cadastramento                           │
│  subdomínio termos/ → Gerenciador de termos/assinaturas      │
│                                                              │
│              ┌─────────────────────────┐                     │
│              │       kunkserver        │                     │
│              │   API REST unificada    │                     │
│              └───────────┬─────────────┘                     │
│                          │                                   │
│                          ▼                                   │
│              ┌─────────────────────────┐                     │
│              │     PostgreSQL          │                     │
│              │  (schema com FKs reais) │                     │
│              └─────────────────────────┘                     │
│                                                              │
│  Módulos opcionais: Loggi, Pagar.me, Google Calendar, …      │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Princípios

1. **Independência** — o núcleo não depende de Directus nem DocuSeal.
2. **Unificação** — um produto, uma API, um banco; superfícies distintas por subdomínio.
3. **Instalabilidade** — instalação completa, documentada, web ou CLI, com ou sem Docker.
4. **Modularidade** — integrações de terceiros desligadas por padrão e ativáveis sob demanda.
5. **Reuso do que funciona** — partir do sistema em produção validado; evoluir a estrutura, não reinventar o domínio de negócio às cegas.
6. **Documentação antes da implementação** — mapear e documentar cada área; só então implementar.

---

## 6. Escopo explícito deste manifesto

**Este documento:**

- Registra a **intenção** e os **objetivos** do projeto open source.
- Orienta o planejamento futuro.

**Este documento não:**

- Altera código, schema, rotas ou infraestrutura agora.
- Detalha migração de dados, contratos de API, UI ou schemas SQL.
- Substitui a documentação técnica por área (a ser escrita na próxima fase).

---

## 7. Próximas fases (ordem pretendida)

1. **Documentação** de todas as áreas do novo projeto (banco, API, painel, cadastro, termos, instalação, módulos, SaaS).
2. **Aprovação** da documentação e do desenho.
3. **Implementação real**, alinhada aos documentos aprovados.

Documentação já iniciada em [`project-tools/docs/`](./project-tools/docs/README.md):

- API: `project-tools/docs/api/`
- Schema / Directus: `project-tools/docs/directus/`
- Frontends (estrutura multi-app + **cadastramento** primeiro): `project-tools/docs/frontend/`

---

## 8. Referências de contexto

- Sistema-fonte: Kunksoucannabis + Cadastramento (produção SouCannabis).
- Remoções planejadas do núcleo: Directus, DocuSeal.
- Infraestrutura alvo para o SaaS de instâncias: [Railway](https://railway.com/).
- Analogias de instalação desejada: WordPress, Mautic.
