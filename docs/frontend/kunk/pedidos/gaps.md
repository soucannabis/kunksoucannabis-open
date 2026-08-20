# Pedidos / Carrinho — Gaps e checklist

## Decisões fechadas

| # | Decisão |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 | Carrinho replica layout/lógica anteriores **sem** cupons, comissão e parceiros |
| 2 | Manter pagamento personalizado, histórico, prescritor + modal cadastro |
| 3 | Frete simulado **entra no total por padrão** (`store.freight.apply_to_total=true`); admin pode desligar |
| 3b | Carrinho lista **todas** as modalidades: Loggi Econômico/Expresso + ME (Correios PAC/Sedex, Azul Express, …) |
| 3c | Favorito `store.freight.default_option`; botão “Definir como padrão” no carrinho para **todos** com acesso ao carrinho |
| 3e | Declaração de conteúdo **única e compartilhada** (`store.freight.content_declaration`) — Loggi e Melhor Envio usam a mesma; **não** portar aleatória anteriores |
| 3f | Dimensões, remetente e declaração **obrigatórios no admin**; **zero hardcode** de entrega no código |
| 4 | Sem seleção de parceiros; prescritores sim |
| 5 | Secrets em tabela nova `system_api_credentials` (criptografada); nunca retornar plaintext ao front |
| 6 | Credenciais também via env; admin identifica source `env` | `db` |
| 7 | Assistente pede todos os campos do serviço; teste automático ao inserir/alterar |
| 7b | **Não salvar** credencial se o teste falhar (mantém valor anterior / vazio) |
| 8 | Módulos têm flags separadas: `use_for_quote` e `use_for_label` |
| 9 | Default: Melhor Envio cota; Loggi cota + etiqueta (como SouCannabis) |
| 10 | Reaproveitar lógica das rotas do implementação anterior (quote/create/cancel) sob `/modules/`* |
| 11 | Rota `/cart` pública **não** existe no OSS |
| 12 | Etiqueta continua na página Pedidos, não no create do carrinho |
| 13 | **Recalcular total no server**; divergência → `TOTAL_MISMATCH` (não grava) |
| 14 | Front do carrinho usa **somente** a facade `/freight/quote` |
| 15 | Persistir `freight_option` + `freight_carrier`; **sem** auto-tag pelo frete |
| 16 | Manter **Desconto** e **Doação** manuais (`discount`, `donation`) — sem cupons |
| 17 | **Zero hardcode** de entrega: peso/dims, remetente, declaração, SISUs etc. **só admin** (secrets: admin ou env); incompleto → `CONFIG_INCOMPLETE`; `label_package` opcional só na etiqueta |
| 18 | `items.amount` = **preço unitário** ; `quantity` = qtd; `products = Σ amount × quantity` (sem re-lookup de catálogo no v1) |
| 19 | UI **Informações** + **Tags** manuais no carrinho; sem sync com frete |
| 20 | Snapshot `dce` só no **create-label**; frete opcional no create (`delivery_price` pode ser 0) |

## Decisões explicadas

### A — Credencial se teste falhar → **não salvar**

1. Usuário informa secrets novos
2. Server testa **antes** de persistir
3. Ok → grava; falha → **não grava**, mantém valor anterior, erro no assistente

### B — Recalcular total → **sim**, erro se divergir

```
products = Σ (item.amount × item.quantity)   // amount = preço unitáriversões anteriores
freight  = apply_to_total ? delivery_price : 0
discount_effective = discount + Σ custom_payment.value
expected_total = max(0, products + freight - discount_effective - donation)
```

Se `|total_client - expected_total| > 0.01` → `400 TOTAL_MISMATCH` com mensagem ao usuário; **não gravar**. 
v1: não revalida preço contra catálogo — só a aritmética do payload.

### C — Dados de entrega → **só admin, zero hardcode**

- **Não** há peso/dims/sede/CNPJ/descrição padrão no código (nem 290 g, nem 500 g, nem Anápolis).
- `store.freight.package`, `store.ship_from`, `store.freight.content_declaration` (e SISUs se usados) são **obrigatórios** no admin Loja.
- Seed: keys com `value` vazio, `is_required=true`, `allow_hardcoded=false`.
- Cotação/etiqueta sem esses valores → `CONFIG_INCOMPLETE`.
- Opcional: `label_package` só se a associação quiser dims diferentes **apenas** na etiqueta.
- Credenciais: admin ou env — nunca no source.

### C2 — Declaração de conteúdo compartilhada (Loja)

`store.freight.content_declaration` — Loggi e Melhor Envio.

### D — Facade no carrinho

Só `POST /freight/quote` (+ default-option). Módulos = label / OAuth / test / admin.

### E — Frete sem auto-tag; info/tags manuais

`freight_option` + `freight_carrier`. Campos Informações + Tags anteriores permanecem, editáveis à mão.

### F — Favorito para quem acessa o carrinho

Administrador | Acolhimento | Produção.

### G — Shape do item

```json
{ "amount": 89.9, "quantity": 2, "code": "OLEO-01", "name": "…", "id": 12, … }
```

`amount` = preço unitário (nome histórico confuso); linha = 179,80.

## Checklist de implementação

### Schema / SQL

- [ ] `system_api_credentials`
- [ ] Seed `system=store`: keys obrigatórias **sem** hardcoded_default de dims/remetente/declaração (value vazio até admin preencher)
- [ ] Colunas `orders.freight_carrier` + `orders.freight_option`
- [ ] Flags `modules.loggi.`* / `modules.melhorenvio.*`

### API

- [ ] Credentials só persistem se teste ok
- [ ] Facade `/freight/quote` + default-option
- [ ] Portar Loggi / Melhor Envio lendo **somente** configs admin (sem fallback numérico/endereço no código)
- [ ] Orders: TOTAL_MISMATCH; discount+donation; sem auto-tag
- [ ] create-label: dce snapshot; sem random declaration

### Admin

- [ ] Loja: apply_to_total, remetente, **caixa (obrigatória, sem default mágico)**, label_package opcional, declaração, favorito
- [ ] Serviços externos: enable, quote/label, assistente
- [ ] Banner/bloqueio se package / ship_from / content_declaration incompletos

### Kunk app

- [ ] novo-pedido: facade, desconto+doação, info+tags manuais, prescritor, histórico
- [ ] Create com TOTAL_MISMATCH
- [ ] Pedidos: etiqueta conforme flags
- [ ] Mensagem clara se frete indisponível por config incompleta

### Docs

- [x] Spec fechada (sem bloqueantes abertos)
- [ ] OpenAPI na implementação

## Status

`pronta para implementação` — decisões bloqueantes fechadas.

## Referências externas

- Loggi: [https://docs.api.loggi.com/reference/nossa-documenta%C3%A7%C3%A3o](https://docs.api.loggi.com/reference/nossa-documenta%C3%A7%C3%A3o)
- Melhor Envio: [https://docs.melhorenvio.com.br/docs/autenticacao](https://docs.melhorenvio.com.br/docs/autenticacao)

