# TODO — alterações futuras

Backlog de melhorias e correções pendentes. Itens ordenados por área; marque como concluído quando implementado.

---

## Admin App

### 1. Pedidos SouCannabis deve iniciar desabilitado

**Status:** concluído (dev → main, ago/2026)  
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

#### Passos sugeridos para correção

- [x] Reproduzir em instalação limpa (sem credenciais SC) e inspecionar `GET /api/v1/admin/external-services/soucannabis_orders` → campo `enabled`.
- [x] Conferir no PostgreSQL: `SELECT value FROM system_configs WHERE key = 'modules.soucannabis_orders.enabled'`.
- [x] Se `enabled = true` sem intenção do operador, corrigir default/seed e adicionar teste de integração garantindo `enabled: false` em instalação nova.
- [x] Validar overview em `/servicos-externos` — card não deve mostrar "Ativo" / "habilitado" sem toggle ligado.
- [ ] (Opcional) Alinhar defaults de `sync_*` para `false` se a intenção for "tudo off" até ativação manual — hoje a migration define `'true'` para sync.

#### Referências

- `project-tools/docs/api/modules/soucannabis_orders.md`
- `project-tools/docs/frontend/kunk/pagamentos-soucannabis/fields.md`
- Teste existente: `kunk-api/tests/integration/domain/pagarme-soucannabis.test.js`

---

## Outras áreas

### 2. Usuário SMTP não deve exigir e-mail

**Status:** concluído (dev → main, ago/2026)  
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

#### Passos sugeridos para correção

- [x] Alterar o campo `user` para aceitar texto simples em vez de `type="email"`.
- [x] Ajustar placeholder para um exemplo neutro, sem obrigar formato de e-mail.
- [x] Validar fluxo com provedores que usam login SMTP não baseado em e-mail.

---

## Testes

### 3. Remover ou substituir `test.skip` / `t.skip` hardcoded

**Status:** concluído (dev → main, ago/2026)  
**Prioridade:** média  
**Escopo:** E2E (4 apps) + API integration

#### Inventário e ações

| Arquivo | Ação |
|---|---|
| `apps/kunk/e2e/cart.spec.js` | Reescrito com `?u=` + mock frete; **skip removido**; passando em produção-teste |
| `apps/*/e2e/helpers/storageCloud.js` | Gate `E2E_STORAGE_CLOUD=1` (fora da bateria principal) |
| `apps/admin/e2e/install.spec.js` | Skip condicional remoto — documentado no registry (local-only) |
| `apps/registration/e2e/auth.spec.js` | Skip condicional `reset_token` — mensagem explícita |
| `kunk-api/.../pagarme-soucannabis.test.js` | Skip condicional audit table — documentado |
| `kunk-api/.../oauth-state.test.js` | Skip condicional OAuth seed — documentado no registry |
| `kunk-api/.../install.test.js` | Skip PG compartilhado — mantido |
| `loggi.live` / `melhorenvio.live` | Gate `RUN_LIVE_FREIGHT_TESTS=true` — documentado no registry |

#### Passos

- [x] **`cart.spec.js`** — reescrever spec e remover `test.skip(true)`.
- [x] **`storage-cloud`** — gate explícito `E2E_STORAGE_CLOUD=1`.
- [x] **`install.spec.js`** — documentar local-only no registry.
- [x] **`registration/auth`** — skip documentado quando reset indisponível.
- [x] **API integration** — mensagens OAuth/audit alinhadas; registry atualizado.
- [x] **Live freight** — documentado no registry/canvas.
- [x] Atualizar `project-tools/roadmap/data/test-registry.json`.

#### Referências

- `project-tools/roadmap/data/test-registry.json`
- Canvas: `relatorio-bateria-testes-producao.canvas.tsx`

---

_(Adicionar novos itens abaixo, seguindo o mesmo formato.)_
