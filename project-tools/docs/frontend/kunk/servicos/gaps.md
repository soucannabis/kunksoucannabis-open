# Serviços — Gaps e checklist

## Decisões fechadas

| # | Decisão |
|---|---|
| 1 | Layout/visual da página Serviços **igual ao legado** |
| 2 | **Não** portar PaymentModal / Pagar.me / `payment_link` / Beeviral / cupons |
| 3 | Status `Aguardando Pagamento` / `Pagamento Concluído` + toggle manual |
| 4 | **Comprovante ao ser enviado → `Pagamento Concluído`** (nos IDs do grupo se agrupado) |
| 5 | Modal Infos (observações, tags, profissional, payment_type, comprovante) |
| 6 | Agrupamento por `booking_group_code` |
| 7 | Só `is_collaborator` no Autocomplete de Serviços |
| 8 | `consultation_price` + `type` no profissional |
| 9 | Google Calendar: principal = associação; secundário = `calendar_id` do profissional; eventos só no secundário |
| 10 | Checkbox **Criar evento no calendário** no create (default off; auto-marca com data) |
| 11 | Sem data no create ok; evento depois via botão Agendar |
| 12 | Editar data com `event_id` → modal de aprovação |
| 13 | `/app/profissionais` com filtros Todos / Colaboradores / Prescritores / Ambos |
| 14 | Soft-delete de profissional (`active=0`) |
| 15 | Acesso a páginas do Kunk **configurável no admin**; **default = todas as páginas para todas as roles staff** (Produção inclui Serviços) |
| 16 | Alinhar `rbac.js`: Produção com acesso a `services` / `services_files` coerente com a página |
| 17 | `payment_type` no modal Info; tipo `psychiatrist` no enum; UI MUI + classes legado |
| 18 | WhatsApp/Utalk **fora** do v1 |
| 19 | Secrets Google só persistem se teste/OAuth ok |
| 20 | **Beneficiário do atendimento:** escolher responsável **ou** paciente (`services.patient_user_code`). Pré-seleção: se `users.patient_user_code` do funil for paciente válido do responsável → selecionar esse paciente |
| 21 | **Exclusão:** hard delete bloqueado se houver vínculos (profissional↔serviços; prescritor↔pedidos; associado↔pedidos/serviços/pacientes) — ver [associados/gaps.md](../associados/gaps.md) |

## Defaults confirmados

| Tema | Decisão |
|---|---|
| Soft-delete profissional | Sim — `active=0` |
| Comprovante | Anexa **e** marca `Pagamento Concluído` |
| Páginas por role | Criar no admin; default allow-all; Produção pode Serviços |
| `payment_type` | Manter no modal Info |
| Tipo `psychiatrist` | No enum |
| Stack UI | MUI + `pageContainerOptions` / `pageContainerTable` |

## Dependência externa

Google Cloud OAuth por instância — necessário para testar Calendar de verdade; não bloqueia UI/API com módulo off.

---

## Checklist de implementação

### Schema / SQL / RBAC

- [x] `professionals.consultation_price`
- [x] Soft-delete via `active` na UI
- [x] Bool flags + compat `'Sim'`/`'Não'`
- [x] Seed google_calendar credentials/configs
- [x] `system_configs` `kunk.role_pages` default `*`
- [x] `rbac.js`: Produção → `services` (+ `services_files`) pelo menos `RU`
- [ ] `services.patient_user_code` (beneficiário) — ver [associados/](../associados/gaps.md)

### API / Admin / Kunk

- [x] Services batch + `create_calendar_event` + comprovante → status pago
- [x] Professionals CRUD + filtros + soft-delete + calendar enrich
- [x] Módulo google_calendar
- [x] Admin: páginas por role + Google Calendar assistente
- [x] ServicesPage + ProfissionaisPage + guards de página

---

## Bloqueantes de produto

Nenhum.
