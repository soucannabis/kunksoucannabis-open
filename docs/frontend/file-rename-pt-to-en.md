# Rename de arquivos: português → inglês

> Inventário dos arquivos em `apps/` cujo **nome de arquivo** (ou export principal) usa português ou mistura PT/EN.
> Objetivo: padronizar para **inglês apenas** nos identificadores de código (paths de módulo, exports, nomes de spec).
>
> **Status:** rename de arquivos + exports **concluído** (2026-07-17). Rotas de URL em português permanecem (fase opcional abaixo).

**Escopo:** nomes de arquivo e símbolos exportados.  
**Fora de escopo desta rodada:** textos de UI em português, pastas de docs em `docs/`, nomes de marca (`melhorenvio`, Loggi, etc.).

**Data do inventário:** 2026-07-17

---

## Resumo por app

| App | Arquivos PT / mistos | Situação |
|---|---|---|
| `apps/admin` | **14** | Concentração total do problema |
| `apps/kunk` | 0 | Já em inglês |
| `apps/registration` | 0 | Já em inglês |
| `apps/doc-sign` | 0 | Já em inglês |

Padrão predominante no admin: **raiz em português + sufixo inglês** (`Page` / `Pages` / `.spec.js`).

---

## Categorias

| Categoria | Critério | Exemplo |
|---|---|---|
| **A — PT + sufixo EN** | Nome do arquivo mistura palavra PT com `Page(s)` | `AparenciaPage.jsx` |
| **B — PT composto + EN** | Duas+ palavras PT + sufixo EN | `ErrosSistemaPage.jsx`, `ServicosExternosEnvioPage.jsx` |
| **C — Arquivo PT / export EN** | Path em PT, símbolos já em inglês | `TriagemPages.jsx` → `TriageShell` |
| **D — Spec kebab PT** | E2E com slug em português | `loja-frete.spec.js` |

---

## 1. `apps/admin` — páginas (`src/pages/`)

| Atual | Categoria | Export(s) atuais | Sugestão de arquivo | Sugestão de export(s) |
|---|---|---|---|---|
| `AparenciaPage.jsx` | A | `AparenciaPage` | `AppearancePage.jsx` | `AppearancePage` |
| `ArmazenamentoPage.jsx` | A | `ArmazenamentoPage` | `StoragePage.jsx` | `StoragePage` |
| `ArquivosPage.jsx` | A | `ArquivosPage` | `FilesPage.jsx` | `FilesPage` |
| `DadosPages.jsx` | A | `DadosIndexPage`, `DadosCollectionPage`, `DadosItemPage` | `DataPages.jsx` | `DataIndexPage`, `DataCollectionPage`, `DataItemPage` |
| `ErrosSistemaPage.jsx` | B | `ErrosSistemaPage` | `SystemErrorsPage.jsx` | `SystemErrorsPage` |
| `LojaPages.jsx` | A / B | `LojaShell`, `LojaIndexPage`, `LojaFretePage`, `LojaStatusPedidosPage` | `StorePages.jsx` | `StoreShell`, `StoreIndexPage`, `StoreFreightPage`, `StoreOrderStatusesPage` |
| `ServicosExternosPages.jsx` | B | `ServicosExternosShell`, `ServicosExternosIndexPage`, `ServicoExternoDetailPage` | `ExternalServicesPages.jsx` | `ExternalServicesShell`, `ExternalServicesIndexPage`, `ExternalServiceDetailPage` |
| `ServicosExternosEnvioPage.jsx` | B | `ServicosExternosEnvioPage` | `ExternalServicesShippingPage.jsx` | `ExternalServicesShippingPage` |
| `TriagemPages.jsx` | C | `TriageShell`, `TriageIndexPage`, `TriageFormPage`, `TriageStatusPage`, `TriageModulesPage` | `TriagePages.jsx` | *(manter exports em inglês)* |
| `UsuariosPages.jsx` | A | `UsuariosPage`, `UsuarioFormPage` | `UsersPages.jsx` | `UsersPage`, `UserFormPage` |

### Já alinhados (não renomear por idioma)

| Arquivo | Nota |
|---|---|
| `ConfigsPages.jsx` | Inglês (abreviação comum) |
| `Ciap2ModulePage.jsx` | Sigla de domínio + inglês |
| `ServicesTypesPage.jsx` | Inglês |
| `RolePagesPage.jsx` | Inglês |
| `WebVitalsPage.jsx` | Inglês |
| `LoginPage.jsx`, `NewPasswordPage.jsx`, `ForbiddenPage.jsx` | Inglês |

---

## 2. `apps/admin` — e2e

| Atual | Categoria | Sugestão |
|---|---|---|
| `e2e/dados.spec.js` | D | `e2e/data.spec.js` |
| `e2e/loja-frete.spec.js` | D | `e2e/store-freight.spec.js` |
| `e2e/loja-status-pedidos.spec.js` | D | `e2e/store-order-statuses.spec.js` |
| `e2e/servicos-externos.spec.js` | D | `e2e/external-services.spec.js` |

Atualizar referências em `e2e/VALIDATION.md` na mesma PR do rename.

---

## 3. Pontos de acoplamento (atualizar no rename)

Arquivos que **importam** os módulos acima (não são PT no nome, mas quebram se o path mudar):

| Arquivo | Relação |
|---|---|
| `apps/admin/src/App.jsx` | Todos os imports e rotas das páginas listadas |
| `apps/admin/src/layout/AdminShell.jsx` | `NavLink` / labels (labels de UI podem permanecer em PT) |
| `apps/admin/e2e/VALIDATION.md` | Nomes dos specs |

Comando útil após o rename (verificar imports quebrados):

```bash
rg -n 'DadosPages|ArquivosPage|ArmazenamentoPage|AparenciaPage|TriagemPages|LojaPages|ServicosExternos|UsuariosPages|ErrosSistemaPage|dados\.spec|loja-frete|loja-status-pedidos|servicos-externos' apps/admin
```

---

## 4. Rotas de URL (opcional, breaking)

Hoje várias rotas do admin estão em português. **Renomear arquivo ≠ renomear URL.**  
Sugestão para uma fase posterior (com redirects se necessário):

| Rota atual | Sugestão EN |
|---|---|
| `/dados` | `/data` |
| `/dados/:collection/novo` | `/data/:collection/new` |
| `/arquivos` | `/files` |
| `/armazenamento` | `/storage` |
| `/erros-sistema` | `/system-errors` |
| `/aparencia` | `/appearance` |
| `/triagem` | `/triage` |
| `/triagem/formulario` | `/triage/form` |
| `/triagem/modulos` | `/triage/modules` |
| `/loja` | `/store` |
| `/loja/frete` | `/store/freight` |
| `/loja/status-pedidos` | `/store/order-statuses` |
| `/servicos-externos` | `/external-services` |
| `/servicos-externos/envio` | `/external-services/shipping` |
| `/usuarios` | `/users` |
| `/usuarios/novo` | `/users/new` |
| `/usuarios/paginas` | `/users/pages` |
| `/nova-senha` | `/new-password` |
| `/sem-permissao` | `/forbidden` |

Defaults em `lastRoute.js` (`fallback = '/dados'`) devem acompanhar a fase de rotas.

**Recomendação:** fazer primeiro só rename de **arquivos + exports**; rotas numa PR separada com redirects `Navigate` dos paths antigos.

---

## 5. Plano de execução sugerido

1. **PR 1 — arquivos + exports (sem mudar URLs)** ✅ feito  
   - `git mv` dos 10 pages + 4 specs  
   - Renomear exports e atualizar `App.jsx`  
   - Ajustar `VALIDATION.md`  
   - Rodar e2e do admin
2. **PR 2 — rotas EN + redirects** (opcional, pendente)  
   - Novos paths + `Navigate` dos antigos  
   - Atualizar e2e `page.goto(...)` e `AdminShell` links  
   - Atualizar `lastRoute` fallbacks
3. **Não incluir** nesta migração: labels visíveis (“Arquivos”, “Loja”, etc.) — produto permanece em português.

---

## 6. Tabela mestre (copy-paste para checklist)

```
[x] AparenciaPage.jsx                  → AppearancePage.jsx
[x] ArmazenamentoPage.jsx              → StoragePage.jsx
[x] ArquivosPage.jsx                   → FilesPage.jsx
[x] DadosPages.jsx                     → DataPages.jsx
[x] ErrosSistemaPage.jsx               → SystemErrorsPage.jsx
[x] LojaPages.jsx                      → StorePages.jsx
[x] ServicosExternosPages.jsx          → ExternalServicesPages.jsx
[x] ServicosExternosEnvioPage.jsx      → ExternalServicesShippingPage.jsx
[x] TriagemPages.jsx                   → TriagePages.jsx
[x] UsuariosPages.jsx                  → UsersPages.jsx
[x] e2e/dados.spec.js                  → e2e/data.spec.js
[x] e2e/loja-frete.spec.js             → e2e/store-freight.spec.js
[x] e2e/loja-status-pedidos.spec.js    → e2e/store-order-statuses.spec.js
[x] e2e/servicos-externos.spec.js      → e2e/external-services.spec.js
```

---

## 7. Outros apps e API

- **`apps/kunk`**, **`apps/registration`**, **`apps/doc-sign`:** nenhum arquivo fonte/spec com nome em português no inventário.
- **`kunk-api/.../melhorenvio*`:** nome da integração/marca Melhor Envio — **manter** (não é “português no código” no mesmo sentido; é identificador do provedor).
