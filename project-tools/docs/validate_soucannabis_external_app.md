# Validação de contato com o app externo

Registro da verificação de conectividade **outbound** (Kunk → app parceira) usando os dados de `External_Apps` no Directus.

**Data da validação:** 2026-07-15  
**Ambiente:** local  
**App no Directus:** App externo teste  

---

## Aplicação validada

| Campo | Valor |
|---|---|
| Nome | App externo teste |
| ID (`External_Apps`) | `c81869f0-2e68-4a1e-bf06-6f2cd52249e8` |
| `client_id` (inbound Kunk) | `7db06ab4-df3f-444d-9a00-73111fb59584` |
| Ativa | sim |
| `payment_percentage` | `10.00` |

### Configuração outbound (parceiro)

| Campo | Valor |
|---|---|
| `outbound_base_url` | `http://localhost:4250` |
| `outbound_token_url` | `http://localhost:4250/api/v1/modules/soucannabis_orders/outbound/auth/token` |
| `outbound_client_id` | `sc-out-20f3396bb62ae493` |
| `outbound_orders_path` | `/api/v1/modules/soucannabis_orders/outbound/orders` |
| `outbound_client_secret` | cifrado no Directus (`enc:v1:…`) via `EXTERNAL_OUTBOUND_CRYPTO_KEY` |

---

## Checklist executado

| # | Teste | Resultado | Notas |
|---|---|---|---|
| 1 | Leitura do registro em `External_Apps` | OK | Campos outbound preenchidos |
| 2 | Cifragem do secret (se estava em texto puro) | OK | Persistido como `enc:v1:…` |
| 3 | `decryptOutboundSecret` roundtrip | OK | Valor original recuperável |
| 4 | `POST` token URL (client_credentials) | **200** | Retorna `access_token`, `token_type`, `expires_in: 3600` |
| 5 | `externalPartnerClient.getPartnerAccessToken` | OK | Token utilizável pelo runtime Kunk |
| 6 | `GET …/outbound/orders/{external_id}` | Auth OK | **404** “Pedido não encontrado” (id de teste inexistente) |
| 7 | `PATCH …/outbound/orders/{external_id}` | Auth OK | **404** (mesmo motivo) |
| 8 | `GET …/outbound/orders` (lista sem id) | 401 | Endpoint de lista não usado pelo Kunk |
| 9 | Kunk server (`:8056`) health | OK | API inbound também no ar |

---

## Conclusão

**Contato outbound validado com sucesso.**

O Kunk consegue:

1. Carregar credenciais de `External_Apps`
2. Decifrar `outbound_client_secret`
3. Obter access token na API do app externo
4. Autenticar chamadas a `…/outbound/orders/{external_id}`

Para sync real de pedidos, o pedido no Kunk precisa ter `external_app_id` + `external_id` correspondente a um pedido existente no app parceiro; aí o painel dispara `PATCH`/`DELETE` automaticamente.

---

## Como repetir a validação

No diretório `kunkserver` (API do parceiro em `:4250` e Directus acessível):

```bash
node -e '
require("dotenv").config({ override: true });
const directusRequest = require("./routes/modules/directusRequest");
const { decryptOutboundSecret } = require("./routes/modules/externalOutboundCrypto");
const { getPartnerAccessToken } = require("./routes/modules/externalPartnerClient");
const axios = require("axios");

(async () => {
  const app = await directusRequest(
    "/items/External_Apps?filter[name][_eq]=App externo teste&limit=1",
    "",
    "GET"
  ).then((r) => (Array.isArray(r) ? r[0] : r));
  if (!app) throw new Error("App não encontrada");

  const secret = decryptOutboundSecret(app.outbound_client_secret);
  const tokenRes = await axios.post(
    app.outbound_token_url,
    {
      grant_type: "client_credentials",
      client_id: app.outbound_client_id,
      client_secret: secret,
    },
    { headers: { "Content-Type": "application/json" }, validateStatus: () => true }
  );
  console.log("token", tokenRes.status, !!tokenRes.data?.access_token);

  const access = await getPartnerAccessToken(app);
  const url =
    String(app.outbound_base_url).replace(/\/$/, "") +
    String(app.outbound_orders_path).replace(/\/$/, "") +
    "/probe-validation";
  const probe = await axios.get(url, {
    headers: { Authorization: "Bearer " + access },
    validateStatus: () => true,
  });
  // 404 = autenticado; 401 = token rejeitado
  console.log("orders probe", probe.status, JSON.stringify(probe.data).slice(0, 200));
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
'
```

Interpretação rápida:

- Token **200** + probe **404** → contato OK  
- Token ≠ 200 → credencial / URL / app parceiro fora do ar  
- Probe **401** → token obtido mas rejeitado nas rotas de pedidos  

---

## Endpoints do parceiro (referência)

| Uso no Kunk | Path no app externo |
|---|---|
| Token outbound | `/api/v1/modules/soucannabis_orders/outbound/auth/token` |
| Pedidos (PATCH/DELETE) | `/api/v1/modules/soucannabis_orders/outbound/orders/{external_id}` |
| Recipients / users | Existem no parceiro; **ainda não** consumidos pelo Kunk |

---

## Segurança

- Não versionar `client_secret` / `outbound_client_secret` em texto puro no git.
- Manter `EXTERNAL_OUTBOUND_CRYPTO_KEY` e `EXTERNAL_API_JWT_SECRET` só no `.env`.
- Preferir sempre gravar outbound secret com o script `register-external-app.js` (já cifra) ou atualizar para `enc:v1:…` após edição manual no Directus.
