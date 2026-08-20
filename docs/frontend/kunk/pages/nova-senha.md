# Redefinição de senha

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/nova-senha` |
| **Componente** | `RedefinePass` |
| **Permissões** | Pública |

## Descrição

Fluxo 'esqueci minha senha': solicitação por e-mail e definição de nova senha via token.

## Funcionalidades

- Solicitar e-mail de redefinição
- Validar token e definir nova senha

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **o schema de origem / kunk-user** | `verify-email`, `redefine-pass` |
| **E-mail SMTP** | `/api/email/send-email-redefine-pass` |

## Dependências de outras páginas / módulos

- `/login`

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
