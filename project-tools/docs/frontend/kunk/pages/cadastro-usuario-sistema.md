# Cadastro de usuário do sistema (convite)

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.
> Fonte: `kunksoucannabis`.

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/cadastro` |
| **Componente** | `SysterUserSign (Cadastro)` |
| **Arquivo legado** | `src/components/externalPages/systemUserSign.jsx` |
| **Permissões** | Pública (acesso via link de convite) |

## Descrição

Criação de conta de usuário interno (staff) a partir de link de convite com token/query.

## Funcionalidades

- Validar e-mail do convite
- Criar registro em `Kunk_Users`
- Definir senha (criptografia no client com CryptoJS no legado)

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **Directus / kunk-user** | `/api/directus/kunk-user` GET/POST |
| **E-mail** | Convite originado em `/app/usuarios` via `/api/email/invite-user` |

## Dependências de outras páginas / módulos

- `/app/usuarios`

## Observações

- —

## Decisão open-source

> Preencher na revisão de escopo.

| Opção | Escolha |
|---|---|
| **Manter** | |
| **Remover** | |
| **Modificar** | |
| **Notas** | Core de onboarding de operadores. |

## Status

`documentado` — aguardando definição de escopo OSS.
