# Financeiro — lançamentos

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.
> Fonte: `kunksoucannabis`.

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/app/financeiro/lancamentos` |
| **Componente** | `FinancesLaunch` |
| **Arquivo legado** | `src/components/master/financesLaunch.jsx` |
| **Permissões** | Só gate `/app` (sem check extra na rota Theme) |

## Descrição

Conciliação e lançamentos financeiros: importa extratos (ex.: Cora), categoriza e grava no Directus.

## Funcionalidades

- Sync extrato Cora por período
- Importação CSV
- Categorizar (categoria / grupo / departamento / variação)
- Criar e deletar lançamentos

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **Directus finances** | `/api/directus/finances/*` |
| **Cora (banco)** | `/api/directus/finances/cora` — mTLS + certs em S3 |
| **AWS S3** | certs do Cora no legado SouCannabis |

## Dependências de outras páginas / módulos

- Financeiro relatório

## Observações

- Cora + bucket S3 são específicos SouCannabis

## Decisão open-source

> Preencher na revisão de escopo.

| Opção | Escolha |
|---|---|
| **Manter** | |
| **Remover** | |
| **Modificar** | |
| **Notas** | Core financeiro genérico; Cora = módulo bancário opcional/SC. |

## Status

`documentado` — aguardando definição de escopo OSS.
