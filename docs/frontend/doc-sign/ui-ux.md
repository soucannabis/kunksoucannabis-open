# Doc-sign — UI / UX

> `apps/doc-sign`: gestão de modelos (TipTap) e assinatura.
> Sem Document Server / OnlyOffice / Collabora.

## Superfícies

| Rota | Auth | Função |
|---|---|---|
| `/termos` | operador | Lista termos + **Novo termo** (modal de associados) |
| `/termos/:id` | operador | Detalhe, variáveis, eventos, baixar PDF |
| `/termos/:id/audit` | operador | Audit log completo |
| `/modelos` | operador | Lista `self` / `with_patient` |
| `/modelos/:kind` | operador | TipTap + variáveis + publicar |
| `/assinar/:token` | token | PDF/HTML + assinatura |

Porta **4258** · subdomínio **`termos.`**

---

## 1. Editor de modelos

- Documento em branco na primeira vez (texto legal do zero)
- **TipTap** (WYSIWYG React): parágrafos, negrito, itálico, listas, alinhamento — escopo de termo, não Word completo
- Toolbar com **Inserir variável** (chips/nós) e **Campo de assinatura**
- Salvar rascunho persiste `content_json`
- Publicar gera PDF na API e versiona
- Preview PDF opcional após publish

---

## 2. Assinatura

Termo renderizado na página (HTML TipTap somente leitura) **acima**; painel draw / type / upload + consentimento **abaixo**. 
Sem iframe/PDF na UI de assinatura (PDF assinável ainda é gerado no backend ao concluir). 
Mobile com canvas touch. Pós-sucesso: redirect ao `cad.` fase 5.

---

## 3. Cadastro fase 4

**Redirect** definitivo para `termos./assinar/:token` (sem iframe).

---

## 4. App doc-sign — Termos

Lista em `/termos` com **Novo termo**: modal busca associados (`GET /users` / `GET /users/search`), cria via `POST /doc-sign/contracts` e copia `signing_url`. Se já houver termo assinado, confirmação + `replace_completed: true`. **Copiar link** reminta token do pending.

---

## 5. Painel Kunk

Novo Termo só sem `completed`. Copiar link: pending → signing URL; completed → PDF/audit.

---

## 6. Audit PDF

Envelope ID, hashes, signatário (email, nome, IP, UA, timezone — **sem Session ID**), campos, assinatura, event log.
