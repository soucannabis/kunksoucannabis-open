# Admin — Pagar.me + Pedidos SouCannabis

Papel: `Administrador`. `apps/admin` → `/servicos-externos`.

## Lista

| Serviço | Dependência |
|---|---|
| Pagar.me | — |
| Pedidos SouCannabis | Pagar.me ativo |

Badges SC: `split pronto` | `conta não PSP` | `%` inválido | `falta recipient associação` | `falta recipient SC` | `falta %`.

---

## 1. Pagar.me (`/servicos-externos/pagarme`)

1. Credenciais (`secret_key`, …) + teste (inclui **probe PSP** → badge Gateway/PSP).
2. **Recebedor da associação** — cadastrar no painel Pagar.me e colar o ID (`re_…` / `rp_…`) → `association_recipient_id`.
3. Exibir URLs webhook (**HTTP Basic obrigatório** no cadastro da Pagar.me, mesmo usuário/senha do Admin):
   - `{PUBLIC_API_URL}/api/v1/modules/pagarme/webhook`
   - `{PUBLIC_API_URL}/api/v1/modules/pagarme/webhook-service`
   Sem Basic Auth a API responde 401 e o pagamento não é confirmado.
4. Status do `soucannabis_recipient_id` (preenchido pela SC via API; fallback suporte colar `rp_…`).
5. Enable + toggles pedidos/serviços.
   - Aviso se Gateway: “Pedidos SouCannabis / split exigem conta PSP”.

---

## 2. Pedidos SouCannabis (`/servicos-externos/soucannabis_orders`)

1. Banner se Pagarme off.
2. Credenciais OAuth + teste (`/token`, `/me`, products, tags).
3. Card `/me` (`payment_percentage`, nome, active). Se `%` não inteiro → erro vermelho + bloqueio.
4. Badge PSP da conta Pagarme; se não PSP → bloquear enable.
5. **Outbound** — gerar/mostrar client_id/secret + `base_url` + paths (obrigatório v1).
6. Instrução: SC chama `POST …/outbound/pagarme/recipients` com o payload do recebedor.
7. Enable só se: Pagarme on + **is_psp** + teste ok + ambos recipients + `%` **inteiro**.

Checkboxes: sync produtos / tags / pedidos.

---

## Seeds

Registrar `pagarme` e `soucannabis_orders` em `SERVICES` (não frete).
