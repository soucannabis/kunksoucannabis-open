# Guia de integração — API externa Kunk

Documentação para **aplicações externas (parceiros)** que criam e gerenciam pedidos no Kunk, consultam catálogo de produtos e tags, e opcionalmente recebem sincronização quando o pedido é alterado no painel Kunk.

**Base URL**

```text
{KUNK_URL}/api/external
```

**Local (desenvolvimento atual):**

```text
http://localhost:8056/api/external
```

Exemplo produção: `https://api.seudominio.com/api/external`

Credenciais (`client_id` / `client_secret`) e URL do ambiente são fornecidas pela equipe Kunk. Guarde o `client_secret` com segurança — ele não é recuperável depois do cadastro.

---

## 1. Visão geral

| Direção | Responsável | O que faz |
|---|---|---|
| **Sua app → Kunk** | Você | Autentica, lista produtos/tags, cria/atualiza/exclui **seus** pedidos |
| **Kunk → sua app** (opcional) | Kunk | Quando o painel altera/exclui um pedido da sua app, chama a sua API |

Cada pedido da integração fica marcado com o `external_app_id` da sua aplicação. Você **só** acessa pedidos dessa marcação.

```text
Sua app                         Kunk
───────                         ────
POST /auth/token  ───────────►  JWT (1 h)
GET  /me          ───────────►  perfil + payment_percentage
GET  /products    ───────────►  catálogo
GET  /tags        ───────────►  tags de pedido
POST /orders      ───────────►  cria (com seu external_id)
PATCH /orders/:id ───────────►  atualiza
                ◄─────────────  (painel) PATCH/DELETE na sua API
```

---

## 2. Autenticação

Padrão **OAuth 2.0 Client Credentials**.

### 2.1 Obter access token

```http
POST /api/external/auth/token
Content-Type: application/json
```

```json
{
  "grant_type": "client_credentials",
  "client_id": "sua-app",
  "client_secret": "seu-segredo"
}
```

- `grant_type` é opcional; se enviado, deve ser `client_credentials`.
- Sem `client_id` / `client_secret` → **400**.
- Credenciais inválidas ou app inativa → **401**.

**Resposta `200`:**

```json
{
  "access_token": "<jwt>",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scopes": ["orders:rw", "products:r", "tags:r"]
}
```

### 2.2 Usar o token

Em todas as rotas (exceto `/auth/token`):

```http
Authorization: Bearer <access_token>
```

Tokens expiram em **3600 segundos**. Renove cerca de 5–10 minutos antes do vencimento.

### 2.3 Scopes

| Scope | Permite |
|---|---|
| *(qualquer token válido)* | `GET /me` |
| `products:r` | `GET /products` |
| `tags:r` | `GET /tags` |
| `orders:rw` | CRUD em `/orders` |

Sem o scope → **403** (`Scope insuficiente: requer …`).

---

## 3. Mapa de endpoints

| Método | Path | Scope | Descrição |
|---|---|---|---|
| `POST` | `/auth/token` | — | Emite JWT |
| `GET` | `/me` | token válido | Perfil da app + `payment_percentage` |
| `GET` | `/products` | `products:r` | Catálogo |
| `GET` | `/tags` | `tags:r` | Tags de pedidos |
| `GET` | `/orders` | `orders:rw` | Lista pedidos da app |
| `GET` | `/orders/:id` | `orders:rw` | Detalhe pelo ID Kunk |
| `POST` | `/orders` | `orders:rw` | Cria pedido |
| `PATCH` | `/orders/:id` | `orders:rw` | Atualiza pedido |
| `DELETE` | `/orders/:id` | `orders:rw` | Exclui pedido |

`:id` = **ID interno do Kunk** retornado no create (não use `external_id` nessa posição da URL).

---

## 4. Perfil da aplicação (`/me`)

```http
GET /api/external/me
Authorization: Bearer <token>
```

Retorna apenas dados de identificação da app autenticada e o percentual configurado no Kunk.

**Não** inclui secrets, hashes nem credenciais outbound.

**Resposta `200`:**

```json
{
  "id": "6e2d7a86-4978-4c48-9e02-c296108a09d6",
  "name": "Parceiro X",
  "client_id": "parceiro-x",
  "active": true,
  "payment_percentage": 8
}
```

| Campo | Descrição |
|---|---|
| `id` | UUID da app no Kunk (`external_app_id` nos pedidos) |
| `name` | Nome cadastrado |
| `client_id` | Client ID público |
| `active` | Se a integração está ativa |
| `payment_percentage` | Número **0–100**. Pode ser `null` se ainda não configurado. |

Use `payment_percentage` nas regras do seu sistema (comissões, cálculos, etc.). A fonte da verdade é o cadastro no Kunk.

> **Nota OSS / split Pagarme:** a instalação open-source que usa split exige `payment_percentage` **inteiro** (ex.: `8`). Valores decimais (ex.: `7.5`) são rejeitados com `PAYMENT_PERCENTAGE_NOT_INTEGER`.

```bash
curl -s "$KUNK_URL/api/external/me" \
  -H "Authorization: Bearer $TOKEN"
```

App inativa ou inexistente → **401**.

---

## 5. Produtos

```http
GET /api/external/products
Authorization: Bearer <token>
```

Retorna array com o catálogo. Campos típicos:

`id`, `status`, `cod`, `name`, `type`, `unity`, `concentration`, `price`, `category`, `photo`, `batch`

Somente leitura. Cacheie no seu lado (o catálogo muda pouco).

```bash
curl -s "$KUNK_URL/api/external/products" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 6. Tags

```http
GET /api/external/tags
Authorization: Bearer <token>
```

Retorna só tags cuja `session` inclui `orders` (as mesmas usadas no painel de pedidos).

Para preencher o campo `tags` do pedido, use o **texto** do campo `tag` de cada item (ex.: `"correio"`), não o `id` da collection — a menos que a equipe Kunk indique outro formato.

```bash
curl -s "$KUNK_URL/api/external/tags" \
  -H "Authorization: Bearer $TOKEN"
```

Exemplo de item:

```json
{
  "id": 12,
  "tag": "correio",
  "session": "orders",
  "color": "#…"
}
```

No pedido: `"tags": ["correio"]`.

---

## 7. Pedidos

### 6.1 Identificadores

| Campo | Quem define | Uso |
|---|---|---|
| `external_id` | Sua app | ID do pedido **no seu sistema**. Obrigatório no create. Único por app. |
| `id` | Kunk | ID interno. Use em `GET/PATCH/DELETE /orders/:id`. |
| `external_app_id` | Kunk | Dono do pedido. **Não envie** — é ignorado/removido se vier no body. |

Duplicar o mesmo `external_id` para a sua app → **409**.

### 6.2 Listar

```http
GET /api/external/orders
GET /api/external/orders?external_id=PED-1001
```

Sempre retorna um **array** (mesmo com `external_id`; pode vir vazio `[]` ou com 1 item).

```bash
curl -s "$KUNK_URL/api/external/orders?external_id=PED-1001" \
  -H "Authorization: Bearer $TOKEN"
```

### 6.3 Obter por ID Kunk

```http
GET /api/external/orders/:id
```

Pedido de outra app ou inexistente → **404**.

### 6.4 Criar

```http
POST /api/external/orders
Content-Type: application/json
Authorization: Bearer <token>
```

**Obrigatórios**

| Campo | Tipo | Notas |
|---|---|---|
| `external_id` | string | Seu ID estável |
| `items` | array | Itens do pedido |
| `total` | number | Valor total |

**Status**  
Se omitido: `"Aguardando pagamento"`.

Status comuns no Kunk (use exatamente estas strings quando for o caso):

- `Aguardando pagamento`
- `Pagamento concluído`

Outros valores podem existir no painel; alinhe com a equipe Kunk se precisar de fluxos específicos.

**Campos recomendados** (envie já resolvidos; o Kunk grava como recebidos):

| Campo | Descrição |
|---|---|
| `user` | Referência do associado no Kunk (se houver) |
| `user_code` | Código do associado |
| `name_associate` | Nome |
| `email` | E-mail |
| `address` | Objeto `{ street, number, complement, neighborhood, city, state, cep }` |
| `delivery_price` | Frete |
| `partner` / `partner_code` | Parceiro |
| `prescriber` / `prescriber_code` | Prescritor |
| `discount` / `donation` | Desconto / doação |
| `info` | Observações |
| `tags` | Array de strings (valores de `GET /tags`) |
| `payment_date` / `payment_form` | Se já pagos |
| `status` | Status do pedido |
| `external_payment_info` | Objeto JSON com dados do pagamento (gateway, método, IDs, etc.) |

**Comportamento extra:** se `total <= 0` e não houver `payment_date`, o Kunk preenche `payment_date` automaticamente com a data/hora atual.

**Resposta `201`:** pedido criado, incluindo `id` do Kunk.

```bash
curl -s -X POST "$KUNK_URL/api/external/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "external_id": "PED-1001",
    "total": 150.5,
    "status": "Aguardando pagamento",
    "items": [
      {
        "cod": "A10",
        "name": "Óleo",
        "quantity": 1,
        "amount": 150.5
      }
    ],
    "name_associate": "Maria Silva",
    "email": "maria@example.com",
    "user_code": "U123",
    "tags": ["correio"],
    "external_payment_info": {
      "provider": "pagarme",
      "method": "pix",
      "transaction_id": "tran_abc123",
      "paid_at": "2026-07-14T15:00:00.000Z"
    },
    "address": {
      "street": "Rua A",
      "number": "10",
      "neighborhood": "Centro",
      "city": "São Paulo",
      "state": "SP",
      "cep": "01000-000"
    }
  }'
```

**Conflito `409`:**

```json
{
  "success": false,
  "message": "Já existe pedido com este external_id para a aplicação",
  "id": "<id-kunk-existente>"
}
```

Trate como “já sincronizado”: use o `id` retornado (ou `GET /orders?external_id=…`) e faça `PATCH`.

### 6.5 Atualizar

```http
PATCH /api/external/orders/:id
Content-Type: application/json
Authorization: Bearer <token>
```

Envie só os campos que mudam.  
**Não** é possível alterar `external_app_id` nem `external_id`.

```bash
curl -s -X PATCH "$KUNK_URL/api/external/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Pagamento concluído",
    "payment_date": "2026-07-14T15:00:00.000Z",
    "tracking_code": "BR123456789BR",
    "external_payment_info": {
      "provider": "pagarme",
      "method": "pix",
      "transaction_id": "tran_abc123"
    }
  }'
```

### 6.6 Excluir

```http
DELETE /api/external/orders/:id
```

**Resposta `200`:**

```json
{ "mensagem": "deleted" }
```

---

## 8. Sync bidirecional

### 7.1 Sua app → Kunk

`POST` / `PATCH` / `DELETE` em `/api/external/orders` **não** disparam chamada de volta para a sua API (anti-loop).

### 7.2 Painel Kunk → sua app

Se o pedido tem `external_app_id` + `external_id` e sua integração tem **outbound** configurado, o Kunk chama:

| Evento no painel | Chamada na sua API |
|---|---|
| Pedido atualizado | `PATCH {sua_base}{orders_path}/{external_id}` |
| Pedido excluído | `DELETE {sua_base}{orders_path}/{external_id}` |

Falha na sua API é só logada no Kunk — a alteração local **não** é desfeita.

---

## 9. Contrato que sua API deve expor (outbound)

Obrigatório **somente** se quiser receber alterações feitas no painel Kunk. Informe URLs e credenciais à equipe Kunk no onboarding.

| Método | Path | Uso |
|---|---|---|
| `POST` | `{token_url}` | Emitir access token para o Kunk |
| `PATCH` | `{base}{orders_path}/{external_id}` | Espelhar update |
| `DELETE` | `{base}{orders_path}/{external_id}` | Espelhar exclusão |
| `GET` | `{base}{orders_path}/{external_id}` | Opcional (reconciliação) |

`orders_path` padrão: `/orders` (ex.: `PATCH https://sua-api.com/orders/PED-1001`).

### Token

O Kunk envia JSON:

```json
{
  "grant_type": "client_credentials",
  "client_id": "<outbound_client_id>",
  "client_secret": "<outbound_client_secret>"
}
```

Resposta esperada:

```json
{
  "access_token": "<token>",
  "expires_in": 3600
}
```

Nas demais chamadas: `Authorization: Bearer <access_token>`.

### Payload do PATCH (campos quando presentes)

`status`, `items`, `total`, `user`, `user_code`, `name_associate`, `email`, `address`, `delivery_price`, `partner`, `partner_code`, `prescriber`, `prescriber_code`, `discount`, `donation`, `info`, `tags`, `tracking_code`, `tracking_code_date`, `payment_date`, `payment_form`, `order_code`, `external_id`, `external_payment_info`, `kunk_order_id`

---

## 10. Códigos HTTP

| Status | Situação |
|---|---|
| `200` | Sucesso (list/get/patch/delete/token) |
| `201` | Pedido criado |
| `400` | Body inválido, falta campo obrigatório, `grant_type` inválido |
| `401` | Sem Bearer, JWT inválido/expirado, credenciais erradas |
| `403` | Scope insuficiente |
| `404` | Pedido inexistente ou de outra app; catálogo vazio (produtos) |
| `409` | `external_id` já usado pela sua app |
| `500` | Erro interno no Kunk |

**Formato de erro:** algumas respostas usam `message` + `success: false`, outras `mensagem`. Sempre priorize o **status HTTP**.

---

## 11. Fluxo recomendado

1. Receber `client_id`, `client_secret` e `KUNK_URL` da equipe Kunk.
2. Implementar obtenção/renovação de token (`/auth/token`).
3. Chamar `GET /me` para obter `payment_percentage` e dados de identificação.
4. Cachear `GET /products` e `GET /tags`.
5. Ao criar pedido no seu sistema, espelhar com `POST /orders` usando o mesmo `external_id`.
6. Guardar o `id` Kunk retornado (ou recuperar com `GET /orders?external_id=…`).
7. Atualizar/excluir com `PATCH`/`DELETE /orders/:id`.
8. Em `409` no create: pegar o `id` e atualizar com `PATCH`.
9. (Opcional) Expor endpoints outbound e informar credenciais à equipe Kunk.

---

## 12. Checklist de onboarding

- [ ] Credenciais inbound recebidas e armazenadas com segurança
- [ ] `POST /auth/token` validado em homologação
- [ ] `GET /me` consultado (`payment_percentage` e identificação)
- [ ] `GET /products` e `GET /tags` consumidos
- [ ] Create com `external_id` estável e payload completo
- [ ] Update/delete usando o `id` do Kunk
- [ ] Tratamento de `409` e renovação de token
- [ ] (Opcional) Endpoints outbound + client credentials
- [ ] Homologação e produção alinhados com a equipe Kunk

---

## 13. Contato

Credenciais, scopes, ambientes e contrato outbound: equipe Kunk / Sou Cannabis.

---

## Consumo pelo Kunk Open Source

A instalação OSS (associação) age como **app parceira** deste contrato quando o módulo `soucannabis_orders` está ativo.

Spec de produto e adaptadores:

- [`frontend/kunk/pagamentos-soucannabis/README.md`](./frontend/kunk/pagamentos-soucannabis/README.md)
- [`api/modules/soucannabis_orders.md`](./api/modules/soucannabis_orders.md)
- Split Pagarme: [`api/modules/pagarme.md`](./api/modules/pagarme.md)

Regras extras no OSS (além deste guia):

1. `POST /orders` na SC **somente** após pagamento concluído na associação (webhook Pagarme, comprovante, ou total 0 manual).
2. Enviar `external_payment_info` (JSON) — ver campo em create/update acima; com split incluir detalhe Pagarme (`type: percentage`).
3. `payment_percentage` de `GET /me` deve ser **inteiro** 0–100; o OSS **bloqueia** decimal (`PAYMENT_PERCENTAGE_NOT_INTEGER`). Conta Pagarme da associação precisa ser **PSP** para split.
4. `user` = nome completo; `user_code` = código do associado **na instalação OSS** (a SC resolve via API dessa instalação).
5. Outbound bidirecional obrigatório; SC cadastra o recebedor Pagarme via `POST …/outbound/pagarme/recipients` no OSS.
6. Spec completa: [`frontend/kunk/pagamentos-soucannabis/`](./frontend/kunk/pagamentos-soucannabis/README.md).
