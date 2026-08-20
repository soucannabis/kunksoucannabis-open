# Rotas de domínio

Rotas além do CRUD genérico, para regras de negócio e fluxos do produto. 
Prefixo: `/api/v1`.

Estas rotas **complementam** `/items`; não substituem listagens simples.

---

## Auth

Ver [authentication.md](./authentication.md).

| Método | Path | Descrição |
|---|---|---|
| POST | `/auth/login` | Login painel (operador). 429 após 5 falhas / 5 min por IP+e-mail (teto 30 / IP) |
| POST | `/auth/logout` | Logout operador |
| GET | `/auth/me` | Operador atual |
| POST | `/auth/associate/register-email` | Cadastro e-mail (fase 1) + sessão associado. 429 após 5 / 15 min / IP |
| POST | `/auth/associate/login` | Login associado. 429 após 5 falhas / 5 min por IP+e-mail (teto 30 / IP) |
| POST | `/auth/associate/logout` | Logout associado |
| GET | `/auth/associate/me` | Associado atual |
| POST | `/auth/associate/forgot-password` | Reset: dispara e-mail |
| POST | `/auth/associate/reset-password` | Reset: consome token |
| POST | `/auth/tokens` | Criar API key (admin) |
| GET | `/auth/tokens` | Listar API keys |
| DELETE | `/auth/tokens/:id` | Revogar |

---

## Users (associados)

| Método | Path | Descrição |
|---|---|---|
| GET | `/users` | Listar (`filter`/`sort`/`limit`; `?patients`; `include=responsible`) |
| GET | `/users/search` | Busca global (nome, CPF, email, telefone) |
| GET | `/users/by-code/:user_code` | Lookup por `user_code` |
| GET | `/users/exists` | `?email=` → estado none / in_progress / associado. 429 após 5 / 15 min / IP |
| POST | `/users` | Criar associado (admin/painel) |
| PATCH | `/users/:id` | Atualizar dados cadastrais no painel (allowlist; funil/sessão só em endpoints dedicados) |
| POST | `/users/:id/make-associate` | `status=Associado` + `associate_status=assinatura_termo` |
| PATCH | `/users/me` | Persistência parcial (sessão associado) |
| GET | `/users/:id/patients` | Pacientes do associado (painel) |
| GET | `/users/me/patients` | Pacientes do responsável logado |
| POST | `/users/me/patients` | Criar paciente (funil) |
| PATCH | `/users/me/patients/:id` | Atualizar paciente (funil) |
| GET | `/users/me/documents/status` | Completude docs identidade (fase 3) |
| POST | `/users/me/advance` | Avançar fase se pré-condições OK |
| POST | `/users/me/complete` | Finalizar → `status=Associado` |
| POST | `/users/:id/handbook` | Atualizar prontuário `handbook` |

Relação paciente↔associado: `users.responsible_code` → `users.user_code`.

Listagens genéricas também em `GET /items/users`.

---

## Doc-sign (assinatura de termos)

> Spec: [`../frontend/doc-sign/`](../frontend/doc-sign/README.md) · API: [`doc-sign.md`](./doc-sign.md)

| Método | Path | Status |
|---|---|---|
| * | `/doc-sign/*` | Implementar na entrega do módulo |
| POST | `/terms/contracts` | Alias deprecado → `/doc-sign/contracts` |
| GET | `/terms/status` | Alias deprecado → `/doc-sign/status` |

Stubs atuais retornam `TERMS_MODULE_IN_DEVELOPMENT` até a entrega. 
**Sem webhook externo** — ao completar assinatura, a própria API atualiza `users.adhesion_term` e `associate_status` 4→5.
---

## Orders

| Método | Path | Descrição |
|---|---|---|
| POST | `/orders` | Criar pedido (items, totais, estoque) |
| PATCH | `/orders/:id/status` | Transição de status (máquina de estados) |
| PATCH | `/orders/:id/production` | `production_owner` / finalizar produção |
| POST | `/orders/:id/payment` | Registrar link/código de pagamento |
| GET | `/orders/stats` | Contagens por status |

---

## Services

| Método | Path | Descrição |
|---|---|---|
| GET | `/services` | Listar (`include=professional,associate`) |
| POST | `/services` | Criar agendamento / serviço |
| PATCH | `/services/:id` | Atualizar |
| GET | `/services/by-professional/:id` | Por profissional (`include` suportado) |
| GET | `/services/exists` | Existe associate+professional  |
| GET | `/services/reports` | Relatório de serviços pagos (mês / profissional / `payable`) — ver [spec](../frontend/kunk/relatorios-servicos/api.md) |
| POST | `/services/reports/validate` | Lote `commission_validation` (staff) |

Portal do profissional (role `Profissional`): listagem escopada a `internal_code`. Contestações e tipos/taxas: mesma spec.

---

## Reception

| Método | Path | Descrição |
|---|---|---|
| GET | `/reception/form-schema` | Schema do form público |
| POST | `/reception/public` | Triagem anônima. 429 após 5 / 15 min / IP |
| POST | `/reception` | Nova triagem (painel) |
| PATCH | `/reception/:id/complete` | Fechar com `completion_reason` |
| PATCH | `/reception/:id/attendant` | Atribuir atendente |

---

## Products / stock

| Método | Path | Descrição |
|---|---|---|
| GET | `/products/export.csv` | Exportar catálogo CSV |
| POST | `/products/import/validate` | Pré-validar importação CSV |
| POST | `/products/import` | Importar/upsert por SKU |
| GET | `/products/:id/movements` | Histórico de estoque do produto |
| POST | `/products/:id/stock` | Ajuste manual de estoque (`delta`) |
| PATCH | `/products/:id/batch` | Atualizar lote |
| POST | `/products/sync-batches` | Sync de lotes |

Baixa automática de estoque ao passar pedido de **Aguardando pagamento** → **Pagamento concluído** (`orders.stock_debited_at` + `product_stock_movements`).

---

## Professionals

| Método | Path | Descrição |
|---|---|---|
| GET | `/professionals` | Lista com filtros de agenda |
| PATCH | `/professionals/:id/donation-balance` | Ajuste de saldo |

---

## Reports

| Método | Path | Descrição |
|---|---|---|
| POST | `/reports` | Salvar definição |
| POST | `/reports/:id/run` | Executar query **sandboxed** (se permitido) |
| POST | `/reports/:id/favorite` | Toggle favorito |

---

## Analytics (Dashboard)

Agregações para Relatórios → Dashboard. Ver [spec](../frontend/kunk/analytics/api.md).

| Método | Path | Descrição |
|---|---|---|
| GET | `/analytics/associates` | KPIs/séries de associados |
| GET | `/analytics/services` | KPIs/séries de serviços (+ payable / taxa) |
| GET | `/analytics/orders` | KPIs/séries de pedidos |
| GET | `/analytics/reception` | KPIs/séries de triagem |

> Execução de SQL arbitrário do cliente **não** deve existir. Se `sql_query` for mantido, restringir a admin + allowlist / parser seguro.

---

## System users (operadores)

| Método | Path | Descrição |
|---|---|---|
| GET | `/system-users` | Listar operadores do painel |
| POST | `/system-users` | Criar operador (admin) |

CRUD genérico também em `/items/system_users` (`system_users`).

---

## Search global

| Método | Path | Descrição |
|---|---|---|
| GET | `/search?q=&entity=` | Busca unificada (users, orders, …) |

Equivalente ao `search.js` atual do implementação anterior.

---

## Health

| Método | Path | Descrição |
|---|---|---|
| GET | `/health` | Liveness (pode ficar fora de `/v1`) |

---

## Critério: items vs domínio

| Usar `/items` | Usar rota de domínio |
|---|---|
| CRUD de tag, product simples | Criar order com items + estoque |
| PATCH de um campo isolado | Mudança de status com regras |
| Listagem filtrada | Relatório com join complexo / side effect |

---

## Migração a partir do implementação anterior

Ver para o mapa `/api/v1/...` → `/api/v1/...`.
