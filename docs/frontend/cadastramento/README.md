# Cadastramento — Documentação do app

> Cadastro público de associados.
> Primeiro frontend a ser recriado no produto unificado.
> Fonte legada: [`cadastramento/`](../../../../cadastramento/) (produção validada, >3000 cadastros).

## Objetivo

Recriar o fluxo de inscrição de associados com:

1. **Mesma lógica de negócio** do app histórico (etapas, status, paciente, documentos, consulta)
2. **Campos do schema alvo** (não o schema de origem / typos antigos)
3. **API `kunk-api`** (não `/api/v1/*`)
4. **Identidade visual preservada**, layout aprimorado (ver [ui-ux.md](./ui-ux.md))
5. Estrutura compatível com painel e termos (ver [`../structure.md`](../structure.md))

## Fora de escopo (neste app / nesta entrega)

- Painel interno completo de acolhimento (só alinhamento mínimo às fases 1–5)
- **Assinatura real de termos** — spec em [`../doc-sign/`](../doc-sign/README.md); fase 4 do cadastro ainda usa stub até a entrega do módulo
- Loja / pedidos

## Índice

| Documento | Conteúdo |
|---|---|
| [flow.md](./flow.md) | Fases 1–5, guards, docs assistente, Associado/patient |
| [fields.md](./fields.md) | Campos origem → schema (`prescription`, `invalid_fields`, …) |
| [ui-ux.md](./ui-ux.md) | Estilo visual a preservar e o que aprimorar |
| [api.md](./api.md) | Contratos de API necessários ao fluxo |
| [gaps.md](./gaps.md) | Decisões fechadas + checklist da entrega |

## Posicionamento no produto

```
subdomínio cad./     →  este app (registration)
         │
         ▼
    kunk-api /v1  ←── mesma API do painel e dos termos
         │
         ▼
    PostgreSQL (users, files, …)
```

## Princípios de recriação

| Fazer | Não fazer |
|---|---|
| Copiar regras de validação e transições de status | Reinventar o funil “do zero” |
| Usar nomes novos de campo no cliente | Manter `emiiter_rg_associate`, `name_associate`, etc. |
| Extrair forms/API para `packages/` | Criar um silo só de cadastro |
| Melhorar responsividade e acessibilidade | Trocar a paleta verde / sidebar de progresso por um look genérico |
| Tratar termos via API de domínio | Embutir o módulo de termos SDK como núcleo permanente |

## Status desta documentação

`proposed` — base para aprovação e implementação de `apps/registration`.
