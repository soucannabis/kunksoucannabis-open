# Serviços

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.
> Fonte: `kunksoucannabis`.

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/app/acolhimento/servicos` |
| **Componente** | `Services` |
| **Arquivo legado** | `src/components/master/services.jsx` |
| **Permissões** | Administrador | Acolhimento | Produção |

## Descrição

Agendamento e gestão de serviços (consultas/atendimentos) com calendário e pagamento. Uma das **quatro páginas principais** do Kunk.

## Funcionalidades

- CRUD de serviços
- Seleção de profissionais/prescritores
- Sincronizar Google Calendar (create/update/delete)
- Observações CIAP2 (motivo de tratamento)
- Anexar documentos
- Aplicar cupons
- WhatsApp (ServiceWhatsappDialog + Utalk)
- PaymentModal (Pagar.me)
- Marcar como pago
- Tags
- Finalizar triagem vinculada

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **Directus** | services, professionals, users, coupons, reception |
| **Google Calendar** | `/api/googleCalendar/` |
| **Utalk** | mensagens WhatsApp |
| **Pagar.me** | pagamento |
| **CIAP2** | módulo local de classificação |

## Dependências de outras páginas / módulos

- Triagem
- Prescritores
- Cupons
- Relatórios de serviços

## Observações

- CIAP2 = domínio saúde/cannabis

## Decisão open-source

> Preencher na revisão de escopo.

| Opção | Escolha |
|---|---|
| **Manter** | |
| **Remover** | |
| **Modificar** | |
| **Notas** | Core serviços. Calendar/Utalk/Pagar.me = módulos. CIAP2 = avaliar remoção/opcional. |

## Status

`documentado` — aguardando definição de escopo OSS.
