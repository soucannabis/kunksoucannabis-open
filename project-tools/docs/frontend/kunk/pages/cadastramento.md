# Cadastramento (associados)

> Documentação funcional da página legada — base para o inventário.
> **Spec de implementação OSS:** [../associados/README.md](../associados/README.md).
> Fonte: `kunksoucannabis`.

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/app/acolhimento/cadastramento` |
| **Componente** | `Dash` |
| **Arquivo legado** | `src/components/master/dash.jsx (+ table.jsx, UserModal, createAssociate, contract)` |
| **Permissões** | Administrador | Acolhimento | Produção (via `role_pages`) |

## Descrição

Página principal de gestão de associados: listagem dos últimos cadastros, filtros de status do funil, criação e modal completo de edição. Uma das **quatro páginas principais** do Kunk. Também recebe deep links do **search global** (`?a=`).

## Funcionalidades

- Listar associados (paginação ~60; query `?a=` para código)
- Filtrar / cards por status (fases OSS 1–5 + Associado)
- Criar novo associado (e-mail)
- Modal: dados, pacientes, prescritor, anotações, documentos, histórico
- Termo de adesão (UI stub — módulo em desenvolvimento)
- Enviar para triagem
- Integração com funil do app de cadastramento público

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **users / users_files** | CRUD associados, pacientes, arquivos |
| **Módulo termos** | Stub — sem DocuSeal nesta entrega |
| **Search global** | [../search-global/README.md](../search-global/README.md) |

## Dependências de outras páginas / módulos

- Triagem, Pedidos, Serviços
- App cadastramento público ([`../../cadastramento/`](../../cadastramento/flow.md))
- FileUpload / documentKinds

## Observações

- Rota irmã `/app/associados` usa a mesma tela com limite alto
- Aba Parceiro **não** portar; só Prescritor
- Paciente ativo global **removido** do painel — seleção do beneficiário em Serviços

## Decisão open-source

| Opção | Escolha |
|---|---|
| **Manter** | Lista, modal tabbed, filtros, deep link, criar associado |
| **Remover** | Parceiro no modal, DocuSeal, Beeviral, Tornar/Remover Ativo |
| **Modificar** | Fases 1–5; termo stub; beneficiário em serviços |
| **Notas** | Spec completa em [associados/](../associados/README.md) |

## Status

`spec pronta` — ver [associados/gaps.md](../associados/gaps.md).
