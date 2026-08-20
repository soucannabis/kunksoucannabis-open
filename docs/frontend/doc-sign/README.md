# Doc-sign — Documentação do app

> Gerenciador nativo de **termos de adesão e assinaturas eletrônicas**.
> Substitui o DocuSeal no produto unificado.
> Referência: DocuSeal ([docs](https://www.docuseal.com/docs))

## Objetivo

1. **Dois modelos** — `self` (himself/pet) e `with_patient` (another)
2. **Editor TipTap no `apps/doc-sign`** — texto do zero + variáveis; fonte de verdade em **JSON (`JSONB`)**
3. **PDF gerado na `kunk-api`** a partir do JSON (sem Document Server / LibreOffice / DOCX)
4. **Assinatura** draw / type / upload
5. **Audit log** com hashes + IP, UA, timezone (**sem session_id**)
6. **Fase 4** por redirect; um `completed` por e-mail/associado; sem webhook

## Fora de escopo (v1)

| Item | Motivo |
|---|---|
| DOCX / OnlyOffice / Collabora / Gotenberg | Evitar sistema extra só para editar/converter |
| Multi-signatários / reassinatura após completed | Regras de produto |
| Editor no `apps/admin` | Só no `doc-sign` |
| Session ID no audit | Excluído |

## Índice

| Documento | Conteúdo |
|---|---|
| [flow.md](./flow.md) | Fluxos |
| [fields.md](./fields.md) | Variáveis + schema (`content_json`) |
| [api.md](./api.md) | Contratos API |
| [ui-ux.md](./ui-ux.md) | TipTap + assinatura |
| [gaps.md](./gaps.md) | Decisões + checklist + stack PDF |

## Posicionamento

```
termos.  →  apps/doc-sign :4258   (TipTap)
cad.     →  registration          (fase 4 redirect)
app.     →  kunk                  (Novo Termo)
         │
         ▼
    kunk-api  (JSON → PDF, assinatura, audit)
         │
         ▼
    PostgreSQL  content_json + term_* + files (PDFs)
```

## Princípios

| Fazer | Não fazer |
|---|---|
| JSONB como fonte do modelo | DOCX canônico + conversor externo |
| TipTap + nós de variável | Labels manuais em PDF estilo DocuSeal |
| PDF na própria `kunk-api` | Container OnlyOffice/LibreOffice |
| Redirect fase 4 | iframe |
| Um `completed` vigente por e-mail | Reassinatura livre sem `replace_completed` |
| `adhesion_term` UUID | path solto em TEXT |

## DocuSeal → OSS

| Legado DocuSeal | doc-sign |
|---|---|
| PDF + labels | TipTap JSON + variáveis |
| Submitters API | `POST /doc-sign/contracts` |
| 3 métodos de assinatura | Iguais |
| Audit Log | `term_events` + PDF |
| Webhook | Handler interno |
| DOCX API | Não usado |

**Código DocuSeal:** não clonar; docs + PDFs de exemplo bastam.

## Status

`proposed` — base para implementação.
