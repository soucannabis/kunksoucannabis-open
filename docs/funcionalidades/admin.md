# Admin — mapa de funcionalidades

> Administração da instância (`apps/admin`, porta **4256**). Role **Administrador**.
> Índice: [README.md](./README.md)

**Auth:** operador (`system_users`).  
**Testes do app:** Playwright (`npm run test:e2e:admin`). Sem Vitest.

## Dados

| Módulo | Página | Descrição | Testes |
|---|---|---|---|
| Registros (CRUD) | `/dados`, `/dados/:collection` | CRUD nas collections whitelist | e2e: Parcial (tags) |
| Item novo/editar | `/dados/:collection/novo`, `…/:id` | Formulário de registro | e2e: Parcial |
| Arquivos | `/arquivos`, `/arquivos/:id` | Listar / ver arquivos | e2e: Sim |
| Dados de exemplo | `/dados` (painel) | Excluir sample data | e2e: Não · API: Sim (GET summary) |

## Configurações do sistema

| Módulo | Página | Descrição | Testes |
|---|---|---|---|
| Variáveis | `/configs`, `/configs/:system` | `system_configs` por sistema | e2e: Sim |
| Cache (atalho) | `/configs/cache` | Mesma tela de cache | e2e: Sim |
| Armazenamento | `/armazenamento` | Driver local / S3 / GCS | e2e: Sim · API: Sim |
| Cache | `/cache` | Ligar/desligar cache operacional | e2e: Sim · API: Sim |
| Aparência | `/aparencia` | Logo, título, cores do Kunk | e2e: Sim |

## Kunk

| Módulo | Página | Descrição | Testes |
|---|---|---|---|
| Configuração de profissionais | `/kunk/configuracao-profissionais` | Taxas / preço padrão / relatório | e2e: Sim |
| Permissões de acesso | `/kunk/permissoes` | Quais páginas cada role vê | e2e: Sim |
| CIAP-2 | `/kunk/ciap2` | Catálogo / módulo CIAP-2 | e2e: Sim · API: Sim |

## Loja

| Módulo | Página | Descrição | Testes |
|---|---|---|---|
| Status dos pedidos | `/loja/status-pedidos` | Labels / fluxo de status | e2e: Sim |

## Webmaster

| Módulo | Página | Descrição | Testes |
|---|---|---|---|
| Operadores | `/usuarios`, `/usuarios/novo`, `/usuarios/:id` | CRUD `system_users` | e2e: Sim |
| Credenciais de suporte | `/credenciais-suporte` | Conta temporária de suporte | e2e: Não · API: Sim |
| API | `/acesso-api` | Tokens Bearer | e2e: Não · API: Sim |
| Webhooks | `/webhooks` | URLs outbound por tabela/ação | e2e: Não · API: Sim |
| Erros do sistema | `/erros-sistema` | Grupos de `system_errors` | e2e: Sim · API: Sim |
| Web Vitals | `/web-vitals` | Métricas Core Web Vitals | e2e: Sim · API: Sim |

## Triagem (config)

| Módulo | Página | Descrição | Testes |
|---|---|---|---|
| Índice triagem | `/triagem` | Hub de config | e2e: Sim |
| Formulário público | `/triagem/formulario` | Campos e publicação | e2e: Sim |
| Status da fila | `/triagem/status` | Status customizados | e2e: Sim |
| Módulos | `/triagem/modulos` | Docs/dados do associado | e2e: Sim |

## Serviços externos

| Módulo | Página | Descrição | Testes |
|---|---|---|---|
| Índice | `/servicos-externos` | Lista e enable de módulos | e2e: Sim |
| Envio (Dados de envio) | `/servicos-externos/envio` | Remetente, caixa, declaração | e2e: Parcial |
| Loggi | `/servicos-externos/loggi` | Credenciais e teste | e2e: Parcial · API: Parcial |
| Melhor Envio | `/servicos-externos/melhorenvio` | OAuth e cotação | e2e: Parcial · API: Parcial |
| Validador de endereço | `/servicos-externos/geoapify` | Validação de endereço (Geoapify) | e2e: Não · API: Parcial |
| Google Calendar | `/servicos-externos/google_calendar` | OAuth e calendários | e2e: Não · API: Parcial |
| E-mail | `/servicos-externos/email` | SMTP / templates | e2e: Não · API: Parcial |
| Pagar.me | `/servicos-externos/pagarme` | PSP, webhooks, split | e2e: Parcial · API: Parcial |
| Pedidos SouCannabis | `/servicos-externos/soucannabis_orders` | Sync externo de pedidos | e2e: Parcial · API: Parcial |
| Utalk | `/servicos-externos/utalk` | WhatsApp / triagem | e2e: Não · API: Parcial |

## Auth / guards

| Módulo | Página | Descrição | Testes |
|---|---|---|---|
| Login | `/login` | Entrada Administrador | e2e: Sim |
| Nova senha | `/nova-senha` | Reset operador | e2e: Não · API: Sim |
| Sem permissão | `/sem-permissao` | Bloqueio de não-admin | e2e: Sim |
| Storage cloud (upload) | (arquivos / probe) | Upload com bucket ativo | e2e: Sim |
| Web Vitals / error boundary | (transversal) | Telemetria e falhas UI | npm: Não · e2e: Não |
