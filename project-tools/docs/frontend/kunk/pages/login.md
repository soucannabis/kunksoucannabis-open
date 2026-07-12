# Login

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.
> Fonte: `kunksoucannabis`.

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/login` |
| **Componente** | `LoginUser` |
| **Arquivo legado** | `src/components/externalPages/userLogin.jsx` |
| **Permissões** | Pública |

## Descrição

Autenticação de operadores e usuários externos (parceiro/prescritor) com e-mail e senha.

## Funcionalidades

- Formulário e-mail/senha com validação de complexidade no client
- Persistência de sessão (cookie HttpOnly) e `LoggedName` no localStorage
- Redirect para `/app` se já autenticado
- Link para fluxo de redefinição de senha

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **Auth** | `POST /api/auth/login`, `GET /api/auth/me` |

## Dependências de outras páginas / módulos

- `/nova-senha`
- `/app`
- `/`

## Observações

- —

## Decisão open-source

> Preencher na revisão de escopo.

| Opção | Escolha |
|---|---|
| **Manter** | |
| **Remover** | |
| **Modificar** | |
| **Notas** | Core — manter. |

## Status

`documentado` — aguardando definição de escopo OSS.
