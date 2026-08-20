# Relatório de pedidos (externo)

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/relatorio/pedidos` |
| **Componente** | `ReportOrders` |
| **Permissões** | Autenticado; destino padrão de Parceiro e Prescritor |

## Descrição

Relatório de pedidos para **Parceiro** (`?pa=`) ou **Prescritor** (`?p=`). Destino padrão após login desses papéis.

## Funcionalidades

- Filtrar pedidos por parceiro ou prescritor (query string)
- Validar / contestar pedidos
- Notificar via Utalk
- Logout

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **Utalk / WhatsApp** | `/api/utalk/message` |
| **Auth** | logout |

## Dependências de outras páginas / módulos

- Espelho de `/app/relatorios/pedidos`
- Parceiros
- Prescritores

## Observações

- —

## Decisão open-source

> Preencher na revisão de escopo.

| Opção | Escolha |
|---|---|
| **Manter** | |
| **Remover** | |
| **Modificar** | |
| **Notas** | Core de afiliados/comissões. |

## Status

`documentado` — aguardando definição de escopo OSS.
