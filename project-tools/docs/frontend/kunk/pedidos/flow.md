# Pedidos / Carrinho — Fluxos

## 1. Entrada na página

| Query | Comportamento |
|---|---|
| (nenhum) | Abre modal de seleção de associado (`FormAssociate`) |
| `?u={user_code}` | Carrega associado e fecha o modal |
| `?p={order_id}` | Modo edição: carrega pedido + associado; itens (exceto frete); restaura `freight_option`/`delivery_price`; **re-cota** e pré-seleciona por `option_key` (se indisponível → cheapest + aviso) |

Rota canônica: `/app/loja/novo-pedido` (autenticada).  
**Não** expor `/cart` público no OSS.

Permissões: `Administrador` | `Acolhimento` | `Produção` (igual legado Theme).

---

## 2. Associado

```
modal FormAssociate ──seleciona──► painel do associado
                                         │
                                         ├── Editar dados (AddressEditDialog / form endereço)
                                         ├── Editar prescrição (DatePrescriptionEdit)
                                         └── Ver associado → /app/acolhimento/cadastramento?a={code}
```

### Regras

1. Endereço de entrega: `address_delivery` se tiver `street`; senão endereço cadastral.
2. Banner de prescrição: verde se `date_prescription` válida (&lt; 1 ano); vermelho se ausente/vencida.
3. Modal de aviso de prescrição vencida (informativo; não bloqueia operador admin).
4. Ao trocar associado: limpar itens? **Não** (legado mantém itens); limpar histórico e recarregar pedidos do novo user.

### APIs

| Ação | Endpoint |
|---|---|
| Load por código | `GET /items/users?filter[user_code][_eq]=…` (ou rota domínio) |
| Histórico | `GET /items/orders?filter[user_code][_eq]=…` |
| Update endereço / prescritor | `PATCH /items/users/:id` |
| Update prescrição | `PATCH /items/users/:id` `{ date_prescription }` |

---

## 3. Catálogo e itens

```
GET produtos (ativos)
       │
       ▼
painel direito: busca / sort / estoque opcional
       │  addCart(qtd)
       ▼
tabela esquerda: itemsCheckout[]
       │
       ▼
subtotal = Σ priceCart
```

Cada item: `{ id, code/cod, name, qntProductCart, price, priceCart, … }`.

Remoção por id.  
Ao reabrir pedido, filtrar itens cujo código seja frete (`isFreightOrderItem`).

---

## 4. Frete (simulação + total)

```
itemsCheckout.length > 0
       │
       ▼
CartFreightSelector
       │
       └── POST /freight/quote   ← única cotação do carrinho (facade)
       ▼
lista unificada de opções
       │
       ├── pré-seleciona store.freight.default_option (se cotada)
       ├── operador escolhe outra linha
       └── [Definir como padrão] → PUT default_option (qualquer role do carrinho)
       │
       ▼
selectedOption + deliveryPrice
       │
       ▼
store.freight.apply_to_total?
       ├── true  → total += deliveryPrice
       └── false → mostra preço, não soma
```

### Regras

1. Debounce ~400 ms; cache por `{cep}::{itens}`.
2. CEP &lt; 8 dígitos → opções `unavailable`.
3. Se histórico tiver pedido `Devolvido` → aviso vermelho (não bloqueia).
4. Mostrar **todas** as modalidades/transportadoras retornadas.
5. Só cotam serviços com módulo **enabled** + `use_for_quote`.
6. Enquanto `freightLoading`, desabilitar “Criar Pedido”.
7. Persistência: `delivery_price`, `freight_carrier`, `freight_option`. **Sem** auto-tag.
8. Frete **opcional**: create permitido com `delivery_price=0` / sem opção ready.
9. Favorito: qualquer operador do carrinho.
10. Create/update: `TOTAL_MISMATCH` se total divergir.

### Total do pedido

```
products = Σ (amount × quantity)   // amount = preço unitário
discount = manualDiscount + Σ customPayments.value
donation = Number(donation)
freight  = apply_to_total ? deliveryPrice : 0
total    = products + freight - discount - donation
```

Se `total <= 0`, legado seta `payment_date` no create — manter.

---

## 5. Prescritor

```
PrescriberForm (visível com itens no carrinho)
       │
       ├── seleciona prescritor → PATCH user.prescriber / prescriber_code
       └── botão "Novo Prescritor" → ProfessionalDialog
                │
                └── POST /items/professionals
```

Sem `PartnerForm`. Sem auto-match Beeviral.

---

## 6. Desconto, doação, pagamento personalizado + histórico

### Desconto e Doação (legado)

Manter os dois campos do `cart.jsx`:

| Campo UI | State | Persistência |
|---|---|---|
| Desconto (R$) | `manualDiscount` | `orders.discount` |
| Doação (R$) | `donation` | `orders.donation` |

Ambos reduzem o total. **Sem** cupons (não preencher `donation` via cupom).

### Pagamento personalizado

Toggle → lista `customPayments[]` `{ item, qnt, value }`.  
Soma no desconto efetivo do total. Persistido em `orders.custom_payment`.

### Histórico

Tabela abaixo do checkout. Excluir status `Aguardando pagamento` / `awaiting-payment`.  
“Comprar novamente” → `addCart({ recoveryOrder: order.items })`.

---

## 7. Criar / atualizar pedido

```
Criar Pedido
       │
       ├── POST /items/orders  (ou /orders)
       │     status: "Aguardando pagamento"
       │     delivery_price, freight_carrier, items, …
       │
       ├── se veio da triagem (email):
       │     PATCH reception → status done / completion_reason Pedido
       │
       └── redirect /app/loja/pedidos
```

Edição (`?p=`): `PATCH /items/orders/:id`.

---

## 8. Etiqueta (página Pedidos — pós-pagamento)

Não no carrinho. Na listagem de pedidos:

```
Pedido elegível
       │
       ├── label_provider = loggi
       │     → POST /modules/loggi/create-label
       │
       └── label_provider = melhorenvio
             → POST /modules/melhorenvio/create-label
       │
       ▼
tracking_code + status "Adicionado no sistema"
```

Cancelamento Loggi: `POST /modules/loggi/cancel`.

Default sugerido (legado SouCannabis): **cotação** Loggi + Melhor Envio; **etiqueta** só Loggi. Configurável no admin de módulos/serviços externos.

---

## 9. Credenciais e teste

```
Admin /servicos-externos
       │  habilita Loggi / Melhor Envio
       │
       ▼
Assistente de configuração
       │  pede todos os campos do serviço
       │  salva em system_api_credentials (criptografado)
       │  NUNCA reexibe secret
       │
       ▼
POST /modules/{name}/test
       │
       ├── ok → marca credentials_valid_at
       └── falha → mantém formulário aberto com erro
```

Cascata de resolução no server: **DB credential** → **env** → erro se required.
