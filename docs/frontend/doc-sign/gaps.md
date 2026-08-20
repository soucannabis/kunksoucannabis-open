# Doc-sign — Gaps e decisões

> Decisões fechadas para implementação.

## Decisões de produto (fechadas)

| # | Tema | Decisão |
|---|---|---|
| 1 | Nome do app | `apps/doc-sign`; subdomínio `termos.`; porta `4258` |
| 2 | Modelos | Exatamente 2: `self` e `with_patient` |
| 3 | Conteúdo inicial | Associação **monta do zero** no editor do `doc-sign` (sem seed; sem editor no `apps/admin`) |
| 4 | Formato do modelo | **JSON** (documento do editor) em `JSONB` no Postgres — **não** DOCX |
| 5 | Editor | WYSIWYG no browser (**TipTap** / ProseMirror) + picker de variáveis (nós especiais) |
| 6 | PDF | Gerado na `kunk-api` a partir do JSON (lib Node, sem serviço extra) |
| 7 | Variáveis | Alinhadas ao schema `users` — [fields.md](./fields.md) |
| 8 | `pet` | Modelo **`self`** |
| 9 | Fase 4 UX | **Redirect** para `termos.` (não iframe) |
| 10 | Assinatura | draw \| type \| upload |
| 11 | Reassinatura | `completed` existente → não cria outro (mesmo user/e-mail) |
| 12 | Painel “Novo Termo” | Só se não houver `completed` |
| 13 | `adhesion_term` | UUID (= `term_contracts.id`) |
| 14 | Audit `session_id` | **Excluído** |
| 15 | Webhook / DocuSeal / Document Server | **Não** |

---

## Formato do documento + PDF (decisão)

### Por que JSON (e não DOCX)

- Evita OnlyOffice, Collabora, LibreOffice, Gotenberg e qualquer conversor externo.
- Encaixa no Postgres (`JSONB`), versionável e consultável.
- O editor web já trabalha com documento estruturado (TipTap/ProseMirror JSON).
- PDF é um **artefato de saída**, não a fonte de verdade.

### Pipeline

```
[TipTap no browser]
     │  content JSON (+ nós de variável / signature)
     ▼
term_template_versions.content_json  (JSONB)
     │
     ├─ publish / gerar contrato
     │     resolve {{vars}} → JSON preenchido
     │     renderer Node → PDF buffer
     ▼
files (term_template_pdf | term_filled_pdf | term_signed_pdf | term_audit_pdf)
```

### Libs sugeridas (só Node, no processo da `kunk-api`)

| Papel | Sugestão | Nota |
|---|---|---|
| Editor front | **TipTap** (React) | JSON nativo; extensões para variável e assinatura |
| PDF do termo | **pdfmake** ou **PDFKit** | Declarativo a partir do JSON; sem Chromium |
| PDF audit | mesma stack | Layout simples (tabelas + texto) |
| Merge assinatura | **pdf-lib** | Carimba imagem da assinatura no PDF preenchido |

Spike curto na implementação: TipTap JSON → docDefinition pdfmake (mapeamento de headings, parágrafos, bold, listas). Escopo de formatação v1: o suficiente para termo legal (não clonar Word).

**Rejeitado:** Puppeteer/Chromium só para PDF; Document Server; DOCX como formato canônico.

---

## Decisões técnicas

### A. Conclusão da assinatura (sem webhook)

1. Persistir assinatura + PDFs + eventos  
2. `users.adhesion_term = contract.id` (UUID)  
3. Se `associate_status === 4` → `5`  
4. Responder sucesso  

### B. Hashes no audit

| Campo | Fonte |
|---|---|
| Original SHA256 | PDF preenchido (`filled_pdf`) |
| Result SHA256 | PDF assinado |

### C. Unicidade `completed`

Índice único parcial por `user_code` / `signer_email`.  
`POST /contracts` com completed → `409 CONTRACT_ALREADY_COMPLETED`.

### D. Token

Opaco 32+ bytes; hash em `signing_token_hash`; TTL default 14 dias.

### E. Audit metadata

`ip`, `user_agent`, `timezone`, `occurred_at`. Sem `session_id`.

### F. Stubs

Remover 501 na entrega. Fase 4→Associado exige `adhesion_term` (sem bypass).

---

## Abertos (spike curto)

| Item | Default |
|---|---|
| pdfmake vs PDFKit | Preferir **pdfmake** (mais declarativo) |
| Fonte “digitar assinatura” | Cursiva open license |
| Void de `pending` no “Novo Termo” | Void anterior + cria novo |

---

## Checklist da entrega

### Schema / API

- [x] Migrations `term_*` com `content_json JSONB`
- [x] Migration `users.adhesion_term` → UUID
- [x] Rotas `/doc-sign/*` + aliases `/terms/*`
- [x] Renderer JSON → PDF na `kunk-api` (pdfmake)
- [x] Merge assinatura + audit PDF + verify
- [x] Conclusão: `adhesion_term` + fase 4→5; 409 se completed
- [x] OpenAPI inventory; remover stubs 501

### App `apps/doc-sign`

- [x] Vite :4258
- [x] TipTap + picker de variáveis + publish
- [x] `/assinar/:token` (3 métodos); audit sem session_id
- [x] Download PDF / contratos

### Integrações

- [x] Registration fase 4 redirect
- [x] Kunk Novo Termo / Copiar link
- [x] CORS / DOC_SIGN_PUBLIC_URL
- [x] E2E docs atualizado; `dev:doc-sign`
- [x] **Sem** container Document Server / LibreOffice

---

## Princípios OSS

Princípios OSS (termos nativos).
