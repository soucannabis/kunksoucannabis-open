# Pedidos / Carrinho — Campos, configs e credenciais

## Tabela `orders` (campos relevantes no checkout)

| Coluna | Uso no carrinho OSS |
|---|---|
| `user` / `user_code` | Associado |
| `name_associate` / `email` | Snapshot |
| `items` (JSONB) | Linhas do carrinho (sem linha “Frete” sintética se `delivery_price` separado) |
| `total` | Total final |
| `delivery_price` | Frete cotado (sempre persistir o valor simulado) |
| `discount` | Desconto manual (R$) — campo do carrinho legado |
| `donation` | Doação (R$) — campo do carrinho legado (reduz o total; **sem** cupons) |
| `custom_payment` | JSON pagamento personalizado (soma junto ao desconto no total) |
| `status` | Default create: `Aguardando pagamento` |
| `address` | Snapshot do endereço de entrega |
| `prescriber` / `prescriber_code` | Prescritor |
| `info` / `tags` | Observações / tags **manuais** — **não** derivadas do frete |
| `kunk_user` | Operador logado |
| `payment_date` | Se total ≤ 0 no create |
| `tracking_code` / `tracking_code_date` | Preenchidos na geração de etiqueta (Pedidos) |
| `dce` | Snapshot da declaração — gravado no **create-label**, não no create do pedido |

### Campos **não** usados no checkout OSS v1

| Campo legado | Motivo |
|---|---|
| `coupon_id` / cupons | Fora de escopo (doação manual permanece) |
| `no_commission` | Fora de escopo |
| `partner` / `partner_code` / `bvid` | Parceiros removidos |

### Campos novos de frete

| Coluna | Tipo | Descrição |
|---|---|---|
| `freight_carrier` | `VARCHAR(32)` nullable | `loggi` \| `melhorenvio` |
| `freight_option` | `JSONB` nullable | Snapshot da modalidade escolhida |

Migração: `project-tools/sql/alter-orders-freight-option.sql`.  
**Não** setar tag `"correio"` automaticamente a partir do frete.

### Shape de `orders.freight_option`

Snapshot da modalidade escolhida. Identifica provider/serviço sem depender de tags.

```json
{
  "option_key": "melhorenvio:1:1",
  "provider": "melhorenvio",
  "company_id": 1,
  "company_name": "Correios",
  "service_id": 1,
  "service_name": "PAC",
  "freight_type": null,
  "service_label": "Correios PAC",
  "price": 12.1,
  "eta_days": 9
}
```

Exemplo Loggi:

```json
{
  "option_key": "loggi:FREIGHT_TYPE_ECONOMIC",
  "provider": "loggi",
  "company_name": "Loggi",
  "freight_type": "FREIGHT_TYPE_ECONOMIC",
  "service_label": "Loggi Econômico",
  "external_service_id": "DLVR-DROF-DOOR-STAN-01",
  "price": 18.5,
  "eta_days": 5
}
```

Complementos: `freight_carrier` (`loggi` \| `melhorenvio`). Sem auto-tag pelo frete. Ver [gaps.md](./gaps.md) §E.
---

## Shape de item do carrinho (`orders.items`)

`amount` = **preço unitário** (legado; nome confuso). `quantity` = quantidade.

```json
{
  "amount": 89.9,
  "concentration": null,
  "unity": "un",
  "quantity": 2,
  "code": "OLEO-01",
  "name": "Óleo 3000mg",
  "id": 12,
  "description": "",
  "category": "Óleos"
}
```

Subtotal da linha = `amount × quantity` (ex.: 179,80).  
Mapeamento: `buildOrderItemsFromCheckout` do legado (`amount` ← `price` do checkout).  
Total do pedido no server: `Σ (amount × quantity)` — sem re-lookup de catálogo no v1.

---

## `system = store` (Loja)

Configs da loja / carrinho em `system_configs`.

| Key | `value_type` | Default | Descrição |
|---|---|---|---|
| `store.freight.apply_to_total` | `boolean` | **`true`** | Se `true`, o valor do frete cotado entra no `total` do carrinho. Se `false`, simula mas não soma (comportamento legado). |
| `store.freight.default_option` | `json` | `null` | Favorito: provider + transportadora + modalidade (ver abaixo) |
| `store.freight.package` | `json` | — (**obrigatório** no admin) | Dimensões/peso da caixa — cotação e etiqueta |
| `store.ship_from` | `json` | — (**obrigatório** no admin) | Remetente / quem envia os pedidos |
| `store.freight.content_declaration` | `json` | — (**obrigatório** para etiqueta) | Declaração de conteúdo **compartilhada** (Loggi + Melhor Envio) |
| `store.freight.loggi.external_service_ids` | `json` | `[]` | SISUs Loggi (homologação) enviados na cotação |
| `store.freight.melhorenvio.enabled_service_ids` | `json` | `null` | IDs de serviço ME a cotar; `null` = todos do catálogo / calculate |

> Declaração de conteúdo é **uma** key na Loja, usada por todos os módulos de entrega — não duplicar em `modules.loggi.*` / `modules.melhorenvio.*`.

### `store.freight.default_option` (favorito da loja)

Opção pré-selecionada no carrinho sempre que a cotação a devolver. Exemplos:

**Melhor Envio > Correios > PAC**

```json
{
  "option_key": "melhorenvio:1:1",
  "provider": "melhorenvio",
  "company_id": 1,
  "company_name": "Correios",
  "service_id": 1,
  "service_name": "PAC",
  "label": "Melhor Envio > Correios > PAC"
}
```

**Loggi > econômico**

```json
{
  "option_key": "loggi:FREIGHT_TYPE_ECONOMIC",
  "provider": "loggi",
  "freight_type": "FREIGHT_TYPE_ECONOMIC",
  "company_name": "Loggi",
  "service_name": "Econômico",
  "label": "Loggi > Econômico"
}
```

**Melhor Envio > Azul > Express**

```json
{
  "option_key": "melhorenvio:9:15",
  "provider": "melhorenvio",
  "company_id": 9,
  "company_name": "Azul Cargo Express",
  "service_id": 15,
  "service_name": "Expresso",
  "label": "Melhor Envio > Azul > Express"
}
```

#### Resolução no carrinho

1. Cotar Loggi + Melhor Envio (providers com `use_for_quote`)
2. Montar lista unificada de `options[]`
3. Se `default_option.option_key` existir na lista → pré-selecionar
4. Senão, match parcial (mesmo `provider` + `freight_type` ou `company_id`+`service_id`)
5. Senão → `cheapest` entre opções ready
6. Operador pode mudar; ação **Definir como padrão** (qualquer role com acesso ao carrinho) grava `store.freight.default_option`

`store.freight.default_carrier` (string simples) **fica obsoleto** — substituído por `default_option`.

### `store.freight.package` — dimensões da caixa (admin Loja)

**Obrigatório.** Sem valor no admin → cotação e etiqueta retornam `CONFIG_INCOMPLETE`.  
**Proibido** hardcode de peso/dims no código (nem 290 g, nem 500 g, nem medidas “de exemplo” usadas em runtime).

Shape (valores **inseridos pela associação**):

```json
{
  "weight_g": null,
  "length_cm": null,
  "width_cm": null,
  "height_cm": null
}
```

| Campo | Regra |
|---|---|
| `weight_g` | &gt; 0, informado no admin |
| `length_cm`, `width_cm`, `height_cm` | &gt; 0, informados no admin |

Seed da key: `is_required=true`, `allow_hardcoded=false`, `value` vazio / nulls até o admin salvar.  
Opcional: `store.freight.label_package` — só create-label; se vazio, usa `package`.  
`dims_etiqueta = label_package ?? package`.

Legado usava 500 g (quote) / 290 g (label) no código — **não portar** esses números.

### `store.ship_from` — quem envia (admin Loja)

**Obrigatório.** Sem hardcode de cidade/CNPJ/telefone/CEP (legado Anápolis etc. **não** entra no código).  
Incompleto → `CONFIG_INCOMPLETE`.

```json
{
  "name": "",
  "phone": "",
  "federal_tax_id": "",
  "street": "",
  "number": "",
  "complement": "",
  "neighborhood": "",
  "city": "",
  "state": "",
  "cep": "",
  "country": "Brasil"
}
```

Completude mínima: `name`, `phone`, `federal_tax_id`, `street`, `number`, `neighborhood`, `city`, `state`, `cep` (8 dígitos). `country` pode defaultar a `Brasil` só como placeholder de formulário se vazio no save — preferível exigir no admin também.

### Princípio: zero hardcode de entrega

| Dado | Onde | Hardcode no código? |
|---|---|---|
| Remetente | `store.ship_from` | não |
| Caixa / peso / dims | `store.freight.package` | não |
| Override etiqueta | `store.freight.label_package` | não (opcional) |
| Declaração de conteúdo | `store.freight.content_declaration` | não |
| SISUs Loggi | `store.freight.loggi.external_service_ids` | não |
| Serviços ME habilitados | `store.freight.melhorenvio.enabled_service_ids` | não (null = todos do catálogo da API) |
| Secrets API | `system_api_credentials` / env | não no source |

### `store.freight.content_declaration` — declaração compartilhada (admin Loja)

**Uma** declaração para Loggi e Melhor Envio. **Obrigatória** para etiqueta; valor **inserido no admin** (sem default numérico/texto no código).

```json
{
  "description": "",
  "total_value": null
}
```

| Campo | Uso Loggi | Uso Melhor Envio |
|---|---|---|
| `description` | `contentDeclaration.description` | Conteúdo do volume quando aplicável |
| `total_value` | `contentDeclaration.totalValue` + `goodsValue` | `insurance` / `insurance_value` |

Regras: obrigatório para etiqueta; cotação usa `total_value`; sem aleatório legado; snapshot `dce` no create-label; UI em `/loja/frete`.  
Seed: `is_required=true`, `allow_hardcoded=false`, value vazio até o admin salvar.

---

## `system = modules` (flags de papel)

Além de `MODULE_*_ENABLED` (env / enable no admin), cada serviço externo tem flags de uso:

| Key | Default sugerido | Descrição |
|---|---|---|
| `modules.loggi.enabled` | `false` | Módulo ativo |
| `modules.loggi.use_for_quote` | `true` | Aparece na simulação do carrinho |
| `modules.loggi.use_for_label` | `true` | Pode gerar etiqueta |
| `modules.melhorenvio.enabled` | `false` | Módulo ativo |
| `modules.melhorenvio.use_for_quote` | `true` | Cotação no carrinho |
| `modules.melhorenvio.use_for_label` | `false` | Default off (legado: ME só cota) |
| `modules.freight.label_provider` | `loggi` | Quem gera etiqueta quando ambos poderiam |

Regra: se `use_for_label` de um serviço for `false`, a UI de Pedidos não oferece criar etiqueta por aquele provider.  
Se nenhum label provider ativo → ocultar ações de etiqueta.

> **Não** existe `modules.{service}.content_declaration` — conteúdo fica em `store.freight.content_declaration`.

---

## Tabela `system_api_credentials`

Nova tabela **relacionada** a `system_configs` / módulos — só secrets e metadados de conexão. Valores sensíveis **sempre** criptografados at-rest com `CONFIG_ENCRYPT_KEY` (AES-256-GCM, mesmo padrão de `system_configs.is_sensitive`).

```sql
CREATE TABLE IF NOT EXISTS system_api_credentials (
  id SERIAL PRIMARY KEY,
  service VARCHAR(64) NOT NULL,          -- 'loggi' | 'melhorenvio' | …
  field_key VARCHAR(128) NOT NULL,       -- 'client_id' | 'client_secret' | 'company_id' | …
  encrypted_value TEXT,                 -- ciphertext; NULL = usar env
  env_fallback VARCHAR(128),            -- nome da env (ex. LOGGI_CLIENT_SECRET)
  is_secret BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  last_tested_at TIMESTAMPTZ,
  last_test_ok BOOLEAN,
  date_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_updated TIMESTAMPTZ,
  UNIQUE (service, field_key)
);
```

### Campos por serviço

#### Loggi

| `field_key` | Secret? | Env fallback | Obrigatório |
|---|---|---|---|
| `client_id` | sim | `LOGGI_CLIENT_ID` | sim |
| `client_secret` | sim | `LOGGI_CLIENT_SECRET` | sim |
| `company_id` | não* | `LOGGI_COMPANY_ID` | sim |
| `api_base_url` | não | `LOGGI_URL_API` | não (default prod) |
| `token_url` | não | `LOGGI_TOKEN_URL` | não |

\* `company_id` não é “senha”, mas tratar como write-once na UI se preferir; pode ser `is_secret=false` e ainda assim **não** misturar com `/config/public`.

Docs oficiais: [Loggi API](https://docs.api.loggi.com/reference/nossa-documenta%C3%A7%C3%A3o) — OAuth client credentials; cotação [`/quotations`](https://docs.api.loggi.com/reference/quote); etiquetas [`/labels`](https://docs.api.loggi.com/reference/criaretiqueta-1); envios `async-shipments` (usado no legado).

#### Melhor Envio

| `field_key` | Secret? | Env fallback | Obrigatório |
|---|---|---|---|
| `client_id` | sim | `MELHOR_ENVIO_CLIENT_ID` | sim |
| `client_secret` | sim | `MELHOR_ENVIO_CLIENT_SECRET` | sim |
| `redirect_uri` | não | `MELHOR_ENVIO_REDIRECT_URI` | sim (OAuth) |
| `api_base_url` | não | `MELHOR_ENVIO_API_URL` | não (prod/sandbox) |
| `access_token` | sim | — | obtido via OAuth (não digitado no assistente inicial) |
| `refresh_token` | sim | — | obtido via OAuth |

Docs oficiais: [Autenticação OAuth2](https://docs.melhorenvio.com.br/docs/autenticacao) · [Cálculo de fretes](https://docs.melhorenvio.com.br/reference/calculo-de-fretes-por-produtos) · scopes `shipping-calculate`, `shipping-generate`, etc.

Tokens OAuth do Melhor Envio **não** ficam em arquivo JSON (legado). Ficam em `system_api_credentials` criptografados.

---

## Resolução de credencial (server)

```
resolveCredential(service, field_key):
  1. row.encrypted_value → decrypt → return
  2. process.env[row.env_fallback] → return (+ source=env)
  3. throw CREDENTIAL_MISSING
```

Resposta ao frontend **nunca** inclui o valor:

```json
{
  "field_key": "client_secret",
  "is_secret": true,
  "has_value": true,
  "source": "db",
  "env_fallback": "LOGGI_CLIENT_SECRET",
  "env_present": false,
  "last_tested_at": "2026-07-11T…",
  "last_test_ok": true
}
```

`source`: `db` \| `env` \| `empty`.

---

## Totais no front (contrato)

```ts
type CartTotals = {
  products: number;           // Σ amount × quantity
  delivery_price: number;
  delivery_applied: number;
  discount: number;           // manual + custom payments
  donation: number;
  total: number;
};
```

Config `store.freight.apply_to_total` via `GET /config/public?system=store` (não sensível) ou endpoint dedicado do carrinho.
