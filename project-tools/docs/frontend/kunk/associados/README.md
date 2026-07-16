# Associados (Cadastramento) — Documentação de implementação

> Reimplementação da página de associados / cadastramento no produto unificado (`apps/kunk` + `kunk-api`).
> Referência legada: [`dash.jsx`](../../../../kunksoucannabis/src/components/master/dash.jsx) + [`table.jsx`](../../../../kunksoucannabis/src/components/table.jsx) + [`UserModal.jsx`](../../../../kunksoucannabis/src/components/modals/UserModal.jsx).
> Funil público (app de cadastramento): [`../cadastramento/`](../../cadastramento/gaps.md).
> Search global: [`../search-global/README.md`](../search-global/README.md).

## Objetivo

Recriar a área de **associados** com:

1. **Mesmo layout e visual** da página legada `/app/acolhimento/cadastramento`
2. Lista dos **últimos cadastros** + cards/filtros de status do funil de cadastramento
3. Resultados vindos do **search global** (deep link `?a=`)
4. **Modal do associado** com as mesmas abas do legado (exceto Parceiro — só Prescritor)
5. Edição de dados do associado e pacientes; criação de pacientes
6. Anotações da equipe de acolhimento
7. Documentos via **FileUpload** já existente (`documentKinds` + `users_files`)
8. Histórico de pedidos e serviços
9. UI de **termo de adesão** (gerar / copiar link) — **stubs nulos** até o módulo de termos existir
10. Nova regra de **beneficiário do atendimento** em Serviços (sem “paciente ativo” global)

## Fora de escopo (v1 desta feature)

| Item | Motivo |
|---|---|
| Assinatura real de termo (app **doc-sign**) | Spec [`../doc-sign/`](../doc-sign/README.md) — interações nulas até a entrega |
| Parceiro no modal | Explicitamente: aba só **Prescritor** |
| Beeviral / `bvid` | Específico SouCannabis |
| Utalk / WhatsApp | Módulo separado |
| Gráficos avançados do legado (`AssociatesChart`, etc.) | Opcional depois; cards de contagem de status **sim** |
| App público de cadastramento | Já tem docs em `frontend/cadastramento/` — esta spec é o **painel** |

## Índice

| Documento | Conteúdo |
|---|---|
| [flow.md](./flow.md) | Fluxos: lista → modal → pacientes → serviços → termo stub |
| [fields.md](./fields.md) | Campos `users`, anotações, docs, serviços (beneficiário) |
| [ui-ux.md](./ui-ux.md) | **Layout e visual iguais ao legado** (obrigatório) |
| [api.md](./api.md) | Contratos `kunk-api` |
| [gaps.md](./gaps.md) | Decisões fechadas + checklist |

Docs relacionadas:

| Documento | Conteúdo |
|---|---|
| [`../search-global/README.md`](../search-global/README.md) | FAB + modal de busca global |
| [`../servicos/README.md`](../servicos/README.md) | Serviços — atualizar seleção associado/paciente |
| [`../../cadastramento/flow.md`](../../cadastramento/flow.md) | Fases `associate_status` 1–5 |
| [`../pages/cadastramento.md`](../pages/cadastramento.md) | Inventário legado curto |

## Posicionamento

```
apps/kunk  /app/acolhimento/cadastramento   ←── operadores (lista + modal)
         │ /app/associados                  ←── atalho opcional (mesma página, lista ampla)
         │
         ├── lista / filtros / cards de status
         ├── criar associado (e-mail)
         ├── modal (abas + termo stub no header)
         ├── deep link ?a={user_code}
         └── search global → abre esta página
         │
         ▼
    kunk-api /v1
         ├── /items/users | /users/*
         ├── /users/:id/patients | /users/:id/annotations
         ├── /users/:id/history
         ├── /search (global)
         └── /files + users_files (FileUpload)
         │
         ▼
    PostgreSQL
         ├── users (responsáveis + pacientes)
         ├── users_files, files
         ├── orders, services, reception
         └── adhesion_term (vazio até módulo termos)
```

## Princípios

| Fazer | Não fazer |
|---|---|
| Replicar layout/cores/estrutura do `dash.jsx` + `table.jsx` + `UserModal` | Inventar dashboard novo |
| Usar fases OSS `associate_status` 1–5 + `status` Associado/patient | Depender só das strings legadas (`published`, `proofs`, …) sem mapa |
| Aba **Prescritor** (sem Parceiro) | Portar PartnerForm |
| Termo: botões visíveis, ações **no-op / null** | Integrar DocuSeal nesta entrega |
| Documentos = `FileUpload` + `documentKinds` | Reinventar uploader paralelo |
| Pacientes listados por `responsible_code` | Usar “paciente ativo” global para montar serviço |
| Em Serviços, escolher beneficiário; pré-selecionar via `users.patient_user_code` do funil se válido | Assumir cegamente o ponteiro sem permitir mudar |

## Status desta documentação

`pronta para implementação` — decisões de escopo fechadas (ver [gaps.md](./gaps.md)).
