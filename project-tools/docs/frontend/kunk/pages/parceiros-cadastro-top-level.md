# Parceiros — cadastro (top-level)

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.
> Fonte: `kunksoucannabis`.

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/parceiros/cadastro` |
| **Componente** | `CreatePartner → default de partnerForm.jsx = SelectPartner` |
| **Arquivo legado** | `src/components/forms/partnerForm.jsx` |
| **Permissões** | Acolhimento |

## Descrição

Rota suspeita/legado: o default export é um **seletor/autocomplete de parceiro**, não um formulário completo de cadastro. O CRUD real está em `/app/parceiros`.

## Funcionalidades

- Autocomplete/seleção de parceiro via `/api/directus/partners/`

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **Directus Partners** | Listagem/busca de parceiros |

## Dependências de outras páginas / módulos

- `/app/parceiros`

## Observações

- Provável remoção ou redirect para `/app/parceiros`

## Decisão open-source

> Preencher na revisão de escopo.

| Opção | Escolha |
|---|---|
| **Manter** | |
| **Remover** | |
| **Modificar** | |
| **Notas** | Candidata forte a remover no open-source. |

## Status

`documentado` — aguardando definição de escopo OSS.
