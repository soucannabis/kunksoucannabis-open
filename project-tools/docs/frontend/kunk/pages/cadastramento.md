# Cadastramento (associados)

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.
> Fonte: `kunksoucannabis`.

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/app/acolhimento/cadastramento` |
| **Componente** | `Dash` |
| **Arquivo legado** | `src/components/master/dash.jsx (+ table.jsx, UserModal, createAssociate, contract, charts)` |
| **Permissões** | Administrador | Acolhimento | Produção |

## Descrição

Página principal de gestão de associados: listagem, filtros de status, criação e modal completo de edição. Uma das **quatro páginas principais** do Kunk.

## Funcionalidades

- Listar associados (paginação ~60; query `?a=` para código)
- Filtrar por status (Associado, termo, erros de cadastro, etc.)
- Criar novo associado
- Abrir UserModal: dados pessoais, documentos, receita, produtos, anotações
- Gerar/enviar contrato (termo de responsabilidade)
- Gráficos/resumo de cadastramento
- Integração com fluxo de onboarding do app de cadastramento público

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **Directus Users / documents** | CRUD de associados e arquivos |
| **DocuSeal** | `/api/docuseal/create-contract` via contract.jsx — a substituir por módulo nativo de termos no OSS |
| **E-mail** | envio indireto via módulos do modal |

## Dependências de outras páginas / módulos

- Triagem
- Pedidos
- Serviços
- Carrinho
- App cadastramento público

## Observações

- Rota irmã `/app/associados` usa o mesmo Dash com `associatesTable` (lista completa limit=-1)
- Domínio cannabis: receita médica, termo, status específicos da SouCannabis

## Decisão open-source

> Preencher na revisão de escopo.

| Opção | Escolha |
|---|---|
| **Manter** | |
| **Remover** | |
| **Modificar** | |
| **Notas** | Core associacional. DocuSeal → módulo termos nativo. Revisar campos/status SC-específicos. |

## Status

`documentado` — aguardando definição de escopo OSS.
