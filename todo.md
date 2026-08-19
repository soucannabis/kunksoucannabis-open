# TODO — alterações futuras

Backlog de melhorias e correções pendentes. Itens ordenados por área; marque como concluído quando implementado.

---

## Admin App

### 1. Pedidos SouCannabis deve iniciar desabilitado

**Status:** pendente  
**Prioridade:** média  
**Rota:** `/servicos-externos/soucannabis_orders`

#### Problema

O módulo **Pedidos SouCannabis** (`soucannabis_orders`) está aparecendo **ativo/habilitado** ao abrir a página no Admin. O comportamento esperado é o mesmo dos demais serviços externos (Loggi, Melhor Envio, Pagar.me, E-mail, etc.): **desabilitado por padrão**, exigindo autenticação e ativação manual pelo operador.

#### Comportamento esperado

| Campo | Valor inicial |
|---|---|
| `modules.soucannabis_orders.enabled` | `false` |
| Toggle "Habilitar módulo" | desmarcado |
| Status no menu/overview | "Desabilitado" ou "Autenticado" (se credenciais ok), nunca "Ativo" sem ação explícita |

#### Contexto técnico

- Chave de config: `modules.soucannabis_orders.enabled` em `system_configs` (`system = 'modules'`).
- Migration prevista: `project-tools/sql/alter-system-configs-modules-soucannabis-orders.sql` — insere `enabled = 'false'`.
- Resolução em runtime: `kunk-api/src/services/moduleFlags.js` → `isModuleEnabled()` (sem valor no Admin → `false`).
- API Admin: `kunk-api/src/routes/externalServices.js` → `getModuleConfigFlags()`.
- UI Admin: `apps/admin/src/pages/ExternalServicesPages.jsx` (toggle `module-enabled-toggle`).
- Status visual: `apps/admin/src/lib/externalServiceStatus.js` → `deriveExternalServiceStatus()`.

#### Hipóteses a investigar

1. **Banco desatualizado** — migration não aplicada ou registro gravado como `'true'` em ambiente de dev/staging.
2. **Confusão com sub-flags** — `sync_products`, `sync_tags` e `sync_orders` vêm como `'true'` na migration; confirmar se o relato é do toggle principal ou desses checkboxes.
3. **Diferença vs. E-mail** — o módulo de e-mail auto-ativa após teste SMTP (`externalServices.js`, rotas `PUT /credentials` e `POST /test`); Pedidos SouCannabis **não** deveria seguir esse padrão.
4. **`sc_status`** — payload inclui `sc_status.enabled` em `kunk-api/src/services/soucannabis_orders/index.js`; garantir que a UI usa `data.enabled` da API e não outro campo.

#### Passos sugeridos para correção

- [ ] Reproduzir em instalação limpa (sem credenciais SC) e inspecionar `GET /api/v1/admin/external-services/soucannabis_orders` → campo `enabled`.
- [ ] Conferir no PostgreSQL: `SELECT value FROM system_configs WHERE key = 'modules.soucannabis_orders.enabled'`.
- [ ] Se `enabled = true` sem intenção do operador, corrigir default/seed e adicionar teste de integração garantindo `enabled: false` em instalação nova.
- [ ] Validar overview em `/servicos-externos` — card não deve mostrar "Ativo" / "habilitado" sem toggle ligado.
- [ ] (Opcional) Alinhar defaults de `sync_*` para `false` se a intenção for "tudo off" até ativação manual — hoje a migration define `'true'` para sync.

#### Referências

- `project-tools/docs/api/modules/soucannabis_orders.md`
- `project-tools/docs/frontend/kunk/pagamentos-soucannabis/fields.md`
- Teste existente: `kunk-api/tests/integration/domain/pagarme-soucannabis.test.js`

---

## Outras áreas

### 2. Usuário SMTP não deve exigir e-mail

**Status:** pendente  
**Prioridade:** média  
**Rota:** `/servicos-externos/email`

#### Problema

Ao definir o campo **Usuário SMTP** no Admin, a interface exige um `@` porque o input está configurado como e-mail. Isso é incorreto para provedores como a Amazon SES, onde o usuário SMTP pode ser apenas um identificador e não necessariamente um endereço de e-mail.

#### Comportamento esperado

| Campo | Regra esperada |
|---|---|
| `user` | aceitar texto livre |
| Validação do navegador | não exigir formato de e-mail |
| Placeholder/exemplo | não induzir obrigatoriamente a uso de e-mail |

#### Contexto técnico

- UI atual: `apps/admin/src/pages/ExternalServicesPages.jsx`
- Campo de credencial: `user` (`Usuário SMTP`)
- Hoje o input usa validação de e-mail no navegador; revisar renderização e placeholder desse campo.

#### Passos sugeridos para correção

- [ ] Alterar o campo `user` para aceitar texto simples em vez de `type="email"`.
- [ ] Ajustar placeholder para um exemplo neutro, sem obrigar formato de e-mail.
- [ ] Validar fluxo com provedores que usam login SMTP não baseado em e-mail.

---

## Testes

### 3. Remover ou substituir `test.skip` / `t.skip` hardcoded

**Status:** pendente  
**Prioridade:** média  
**Escopo:** E2E (4 apps) + API integration

#### Problema

Vários testes usam `test.skip(true, …)` ou `t.skip(…)` fixos/condicionais, reduzindo cobertura real da bateria (ex.: E2E Kunk 28 pass + **2 skips** na rodada de produção). Alguns comentários estão desatualizados — ex.: `cart.spec.js` adiado por Loggi/ME off, mas a spec mocka frete e hoje o bloqueio real é falta de `?u=`/`?ic=` no carrinho.

#### Inventário atual

| Arquivo | Motivo do skip |
|---|---|
| `apps/kunk/e2e/cart.spec.js` | `test.skip(true)` — carrinho/frete adiado (spec desatualizada) |
| `apps/*/e2e/helpers/storageCloud.js` (admin, kunk, doc-sign, registration) | Skip se driver ≠ S3/GCS ou login falha |
| `apps/admin/e2e/install.spec.js` | Skip em ambiente remoto (Railway) |
| `apps/registration/e2e/auth.spec.js` | Skip se `reset_token` indisponível (API ≠ `NODE_ENV=test`) |
| `kunk-api/tests/integration/domain/pagarme-soucannabis.test.js` | `t.skip` se tabela `soucannabis_orders_audit` ausente |
| `kunk-api/tests/integration/modules/oauth-state.test.js` | `t.skip` se credenciais OAuth ausentes no PG |
| `kunk-api/tests/integration/domain/install.test.js` | `describe` skip em PG compartilhado de produção |
| `kunk-api/tests/integration/modules/loggi.live.test.js` | Suite skip sem `RUN_LIVE_FREIGHT_TESTS=true` |
| `kunk-api/tests/integration/modules/melhorenvio.live.test.js` | Idem |

#### Passos sugeridos

- [ ] **`cart.spec.js`** — reescrever spec (`?u=` + associado com CEP, mock de frete/pedido) e remover `test.skip(true)`.
- [ ] **`storage-cloud`** — provisionar bucket S3/GCS no ambiente de teste **ou** mover specs para job dedicado com gate explícito documentado (evitar skip silencioso na bateria principal).
- [ ] **`install.spec.js`** — manter skip em Railway só se instalador fresh for impossível; documentar no registry ou extrair para suite `local-only`.
- [ ] **`registration/auth`** — garantir endpoint de reset em ambiente de teste ou mockar fluxo.
- [ ] **API integration** — aplicar migration `soucannabis_orders_audit`; seed de credenciais OAuth de teste; revisar skips de `install-sample` em PG compartilhado.
- [ ] **Live freight** — decidir se suites `loggi.live` / `melhorenvio.live` entram em CI com flag ou ficam fora do inventário “bateria completa”.
- [ ] Atualizar `project-tools/roadmap/data/test-registry.json` e canvas de bateria após cada skip removido.

#### Referências

- `tmp/test-production/e2e-kunk-full-after-fix.log` (2 skips: cart + storage-cloud)
- `project-tools/roadmap/data/test-registry.json` — entrada `e2e/cart.spec.js`

---

_(Adicionar novos itens abaixo, seguindo o mesmo formato.)_
