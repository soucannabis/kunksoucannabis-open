# UI / UX — PaymentModal, tags e carrinho

## 1. PaymentModal

Referência: `payment.jsx` legado.

### Entrada

`paymentType` `order` | `service`; entity com totais, links, associado.

### Abas

| Aba | Standalone | `split_mode` (pedido) |
|---|---|---|
| Cartão de crédito | sim | sim |
| Boleto | sim | sim |
| Cartão parcial | sim | **ocultar** |

Banner em split: “Pagamento com split SouCannabis (X%)”.  
Se `!split_ready` e SC on: disabled + “Configure no Admin”.

Só pagamento (sem botão etiqueta do legado).

### Serviços

PaymentModal se `use_for_services`; sem banner SC.

---

## 2. Status de pagamento (pedidos)

| UI | `split_mode` + total > 0 | total = 0 |
|---|---|---|
| Toggle pago/aguardando | **bloqueado** para → pago; reverter pago→aguardando permitido (com sync SC) | toggle permitido |
| Comprovante | permitido → marca pago → sync SC | n/a |
| PaymentModal | cartão/boleto | oculto / desnecessário |

Feedback de sync: ícone ok / erro + retry.

---

## 3. Carrinho (`split_mode`)

- Badge “Catálogo SouCannabis”.
- **Sem** seletor/cotação de frete; não somar `delivery_price`.
- Sem avisos de estoque insuficiente / baixa local.
- Restante (associado, desconto, doação, prescritor) conforme pedidos OSS.

---

## 4. Tags

```text
Tags do sistema        ← editáveis
Tags SouCannabis       ← somente leitura (cor/nome da API)
```

No pedido: multi-select com grupos; valores SC são strings `tag` remotos.

---

## 5. Admin

Mesmo padrão visual dos outros serviços externos (assistente, teste, secrets write-only).
