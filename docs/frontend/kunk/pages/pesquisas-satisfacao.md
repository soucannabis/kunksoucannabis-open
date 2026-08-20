# Pesquisas de satisfação

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/app/acolhimento/pesquisas-satisfacao` |
| **Componente** | `SatisfactionSurveys` |
| **Permissões** | Administrador | Acolhimento | Produção |

## Descrição

Inbox de pesquisas de satisfação (NPS, tratamento, setores) vinculadas a associados.

## Funcionalidades

- Listar pesquisas e ver respostas
- Atualizar status
- Enviar follow-up por e-mail ou WhatsApp
- Abrir associado relacionado

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **Utalk / WhatsApp** | `/api/utalk/message` |
| **E-mail** | `/api/email/send-email` |

## Dependências de outras páginas / módulos

- Cadastramento

## Observações

- Campos de tratamento ≈ domínio cannabis/saúde

## Decisão open-source

> Preencher na revisão de escopo.

| Opção | Escolha |
|---|---|
| **Manter** | |
| **Remover** | |
| **Modificar** | |
| **Notas** | Core de qualidade; revisar campos SC. |

## Status

`documentado` — aguardando definição de escopo OSS.
