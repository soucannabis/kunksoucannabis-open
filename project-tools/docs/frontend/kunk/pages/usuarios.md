# Usuários do sistema

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.
> Fonte: `kunksoucannabis`.

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/app/usuarios` |
| **Componente** | `SystemUsers` |
| **Arquivo legado** | `src/components/master/systemUsers.jsx` |
| **Permissões** | Administrador | Acolhimento | Produção |

## Descrição

Gestão de operadores do Kunk (`Kunk_Users` / system_users).

## Funcionalidades

- Listar usuários internos
- Editar permissões (systemUserModal)
- Convidar por e-mail

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **Directus kunk-user** | `/api/directus/kunk-user/all` |
| **E-mail** | `/api/email/invite-user` |

## Dependências de outras páginas / módulos

- `/cadastro` (aceite do convite)

## Observações

- No produto unificado, parte disso pode migrar para o app Admin

## Decisão open-source

> Preencher na revisão de escopo.

| Opção | Escolha |
|---|---|
| **Manter** | |
| **Remover** | |
| **Modificar** | |
| **Notas** | Core. Avaliar overlap com apps/admin. |

## Status

`documentado` — aguardando definição de escopo OSS.
