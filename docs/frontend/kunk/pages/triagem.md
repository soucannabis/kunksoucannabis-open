# Triagem / acolhimento

> Página operacional de fila de acolhimento (`reception`).
> **Especificação de implementação (novo projeto):** [`../triagem/`](../triagem/README.md).
> Fonte legada: `kunksoucannabis` (`reception.jsx`).

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/app/acolhimento/triagem` |
| **App novo** | `apps/kunk/src/pages/reception/TriagePage.jsx` (stub → implementação) |
| **Componente legado** | `Reception` + `ReceptionTableRow` |
| **Arquivo legado** | `src/components/master/reception.jsx` + `reception/*` |
| **Permissões** | Administrador \| Acolhimento \| Produção |

## Descrição

Fila de acolhimento: leads e associados aguardando contato. Uma das **quatro páginas principais** do Kunk. No OSS, a entrada na fila é um **formulário público configurável** (admin); a operação é sidebar de status + tabela, com redirect para pedidos/serviços **somente** se houver associado linkado.

## Funcionalidades (alvo OSS)

- Sidebar de status configuráveis (Espera, Concluído + custom) com contagens
- Troca de status pelo menu do avatar
- Listar `reception`; busca; vínculo por e-mail (auto no form) e manual
- Campos personalizados do form na linha
- Pedido / Serviço com gate de `associate_code` + contabilização (`completion_reason`)
- Módulo documentos/dados **opcional** (default off)

## Explicitamente fora

- Utalk / WhatsApp sync
- Beeviral
- Histórico de doações

## Integrações

| Serviço | Uso |
|---|---|
| **kunk-api** + PostgreSQL | `reception`, `users`, `system_configs` (`system=triage`) |
| **Admin** | `/triagem/*` — form, status, módulos |

## Dependências de outras páginas / módulos

- Novo pedido / Pedidos (conclusão com `completion_reason=Pedido`)
- Serviços (idem)
- Users / files (módulo docs, se habilitado)

## Decisão open-source

| Opção | Escolha |
|---|---|
| **Manter** | Fila, status, link associado, redirect pedidos/serviços, contagens |
| **Remover** | Utalk, Beeviral, histórico de doações |
| **Modificar** | Form externo configurável no admin; status em `system_configs`; docs/dados como módulo opt-in |
| **Notas** | Spec completa em [`../triagem/`](../triagem/) |

## Status

`proposed` — documentação de implementação pronta; página ainda stub.
