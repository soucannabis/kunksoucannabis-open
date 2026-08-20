# Relatórios de serviços — Gaps e checklist

## Decisões fechadas

| # | Decisão |
|---|---|
| 1 | **Só** relatório de serviços nesta entrega (pedidos = fora) |
| 2 | Layout/visual **igual aversões anteriores** `reportServices.jsx` |
| 3 | Só serviços com status `Pagamento Concluído` **e** `consultation_date` preenchida |
| 4 | Agrupamento por mês de `consultation_date` → profissional → linhas |
| 5 | `payable = max(0, price − association_fee [− donation se flag])`; **default fee = 0** |
| 6 | Taxas e tipos no **admin** + flag global **descontar doação do pagamento** |
| 7 | `default_consultation_price` por tipo **anula** `consultation_price` do profissional no create |
| 8 | Role **`Profissional`** + `system_users.internal_code` = `professional_code` |
| 9 | Portal `/relatorio/servicos` (sem shell staff); staff em `/app/relatorios/servicos` |
| 10 | Contestações em `contest_reports` (mês + texto); staff resolve sem Utalk |
| 11 | `commission_validation` por linha (`approved` / `contested`) — staff only |
| 12 | **Não** portar: cupons, recipient, n8n Pagamento, Utalk, bônus por tags |
| 13 | Totais staff/portal usam a **mesma** fórmula `payable` |
| 14 | `role_pages`: Profissional → **somente** `relatorios-servicos` (nunca outras páginas do Kunk) |
| 15 | Select de tipos no cadastro de profissionais lê o catálogo admin |
| 16 | Taxa aplica **sempre** conforme admin (não só quando o preço “bate” com o padrão) |
| 17 | Sistema novo — sem migração/congelamento de taxas anteriores |
| 18 | Conta criada em **`/app/profissionais`**: “Criar conta” + convite por e-mail (link com expiração → `/cadastro`) |
| 19 | E-mail SMTP / envio de convite: **stub** até módulo de e-mail; registrar integração futura |
| 20 | **Sem** role `Prescritor` neste módulo — só colaboradores com acesso ao relatório |
| 21 | Serviços **sem** `consultation_date` → **excluídos** do relatório (não somam) |

## Defaults confirmados

| Tema | Decisão |
|---|---|
| `association_fee` seed | `0` para todos os tipos canônicos |
| `default_consultation_price` seed | `null` (usa preço do profissional) |
| `deduct_donation_from_payable` | **`false`** (Sou Cannabis: doação não desconta; outras associações podem ligar) |
| Mês default UI | Mês civil **anterior** |
| Opções de mês | Ano corrente até mês atual |
| Stack UI | MUI + `pageContainerOptions` / `pageContainerTable` |
| Login profissional | Obrigatório; pós-login só `/relatorio/servicos` |

## Dependências

| Dep | Notas |
|---|---|
| Módulo Serviços / Profissionais | Dados + create price resolution + botão criar conta |
| Fluxo `/cadastro` (convite system_users) | Mesma lógica anteriores `systemUserSign` |
| Módulo de e-mail (SMTP / invite) | **Ainda não implementado** — ver § Integração futura |
| `role_pages` | Estender role `Profissional` + page id |
| FileUpload / comprovantes | Coluna Comp se reutilizar viewer |

## Integração futura — e-mail de convite

| Item | Estado |
|---|---|
| Gerar link assinado com expiração (histórico ~1h) | Implementar na API mesmo sem SMTP |
| Persistência do convite / `system_users` pending | Implementar |
| Tela `/cadastro` (senha + dados) | Implementar (espelhversões anteriores) |
| `POST` envio de e-mail com o link | **Stub** / `501` ou fila no-op até módulo e-mail |
| Quando e-mail existir | Conectar o mesmo endpoint sem mudar o fluxo de profissionais |

Não bloquear a criação da conta / link por falta de SMTP: staff deve poder **copiar o link** enquanto o envio automático estiver pendente.

---

## Checklist de implementação

### Schema / SQL / RBAC

- [x] `services.commission_validation`
- [x] Seed `system_configs` `services.professional_types`
- [x] `rbac.js`: role `Profissional` + escopo por `internal_code`
- [x] `role_pages` default para Profissional
- [x] Confirmar `contest_reports` JSONB em `professionals`

### API

- [x] `GET /services/reports` (payable server-side)
- [x] PATCH validation (lote)
- [x] POST/DELETE contest-reports
- [x] GET/PUT professional-types + report-settings
- [x] Helper `resolveConsultationPrice` no create de services
- [x] Auth redirect Profissional → `/relatorio/servicos`
- [x] `POST /professionals/:id/portal-access` (+ resend)

### Admin

- [x] UI tipos / taxas / preço padrão
- [x] Switch `deduct_donation_from_payable`
- [x] Seed `professional_types` + `report_settings`
- [x] Páginas por role: `Profissional` → só `relatorios-servicos`

### API (convite)

- [x] `POST /professionals/:id/portal-access` (+ resend)
- [x] Token com expiração + `/cadastro`
- [x] Stub e-mail (`email_sent: false`) + copiar link na UI
- [x] Hard-deny role Profissional fora do relatório

### Frontend `apps/kunk`

- [x] Página staff `/app/relatorios/servicos`
- [x] Portal `/relatorio/servicos` (único destino do role Profissional)
- [x] Menu + `role_pages` + `roleRedirect` (hard-deny outras rotas `/app/*`)
- [x] PDF export
- [ ] Viewer comprovantes (coluna Comp) — reutilizar depois se houver componente
- [x] Contestações UI
- [x] Ações aprovar/contestar (staff)
- [x] Profissionais: “Criar conta” + convite (copiar link; e-mail stub)
- [x] Tela `/cadastro` reutilizada p/ profissional
- [x] Select type + price default a partir do catálogo
- [x] Excluir serviços sem `consultation_date` na listagem do relatório

### Docs / inventário

- [x] Spec `relatorios-servicos/`
- [x] Atualizar [`../servicos/fields.md`](../servicos/fields.md) (defaults de preço via catálogo)
- [x] Atualizar pages histórico + índice kunk README
- [x] `authorization.md` / `domain-routes.md` / `admin/flow.md`

---

## Bloqueantes de produto

Nenhum — decisões 1–6 das dúvidas anteriores fechadas nesta revisão.

## Notas de configuração Sou Cannabis (instância)

Após seed OSS:

| Config | Valor SC sugerido |
|---|---|
| `deduct_donation_from_payable` | `false` |
| medic / psychiatrist `association_fee` | `20` |
| therapist `association_fee` | `10` |
| defaults de preço | opcional (240 / 110) |

Não reintroduzir bônus de tags no código.
