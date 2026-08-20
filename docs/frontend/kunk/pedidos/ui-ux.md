# Pedidos / Carrinho — UI/UX (`apps/kunk`)

> Replicar o layout e a lógica visual anteriores `cart.jsx`, sem cupons, comissão e parceiros.
> Frete passa a integrar o total conforme config da loja.

## Rota

`/app/loja/novo-pedido` dentro do shell Theme.

---

## Estrutura da página

```
┌─ [Novo Prescritor] ─────────────────────────────────────────┐
│  Modal associado (se sem ?u / ?p)                            │
│                                                              │
│  ┌─ Painel associado ─────────────────────────────────────┐  │
│  │ Nome, email, telefone                                   │  │
│  │ Endereço (delivery ou cadastral)                        │  │
│  │ [Editar Dados] [Editar Prescrição] [Ver Associado]      │  │
│  │ Banner validade da receita                              │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Esquerda (~7) ──────────┐  ┌─ Direita (~5) ──────────┐ │
│  │ Tabela itens             │  │ Catálogo produtos       │ │
│  │ Pagamento personalizado  │  │ busca / sort / estoque  │ │
│  │ Prescritor               │  │                         │ │
│  │ Simulação de frete       │  │                         │ │
│  │ Total (produtos+frete?)  │  │                         │ │
│  │ [Criar / Alterar Pedido] │  │                         │ │
│  │ Histórico de pedidos     │  │                         │ │
│  └──────────────────────────┘  └─────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## O que manter anteriores

| Bloco | Detalhe |
|---|---|
| Modal associado | `FormAssociate` ao entrar sem `u`/`p` |
| Painel associado | Dados + endereço + 3 ações |
| Prescrição | Banner + `DatePrescriptionEdit` + popup vencida |
| Tabela carrinho | qtd, preço, remover, soma |
| Catálogo | add por input de quantidade |
| Prescritor | `PrescriberForm` + botão **Novo Prescritor** + `ProfessionalDialog` |
| Pagamento personalizado | toggle + lista |
| Desconto (R$) + Doação (R$) | campos manuais anteriores (sem cupons) |
| Informações + Tags | campos manuais anteriores; **sem** sync com frete |
| Histórico | tabela + recompra |
| Frete | lista via facade; favorito; loading; ETA; preço |
| Create/Update | toast + redirect pedidos; finalizar triagem se aplicável |

---

## O que remover da UI

| Blocversões anteriores | Ação |
|---|---|
| Seção de cupons | Não renderizar |
| Checkbox “Não aplicar comissão” | Não renderizar |
| `PartnerForm` / Beeviral | Não renderizar |
| Caption “Valores estimados — não entram no total” | Substituir conforme config |

---

## Frete — copy e total

### Quando `apply_to_total === true` (default)

- Título: **Simulação de frete**
- Caption: **O valor selecionado entra no total do pedido.**
- Linha no resumo: `Frete: R$ …`
- `total` exibido = produtos − descontos + frete

### Quando `apply_to_total === false`

- Caption: **Valores estimados — não entram no total do pedido.** 
- Ainda mostra preços e permite escolher opção
- `delivery_price` persiste no pedido; `total` sem frete

### Lista de opções (não só 2 radios)

Substituir o radiversões anteriores “Loggi | Sedex” por uma **lista de modalidades cotadas**, agrupada por provider:

```
Simulação de frete
○ Loggi · Econômico · R$ 18,50 · 5 dia(s)
● Loggi · Expresso · R$ 22,90 · 3 dia(s)
○ Melhor Envio · Correios · PAC · R$ 12,10 · 9 dia(s)
○ Melhor Envio · Correios · Sedex · R$ 18,40 · 5 dia(s)
○ Melhor Envio · Azul · Express · R$ 29,00 · 3 dia(s)

[Definir como padrão]   ← qualquer role com acesso ao carrinho; grava store.freight.default_option
Favorito atual: Melhor Envio > Correios > PAC
```

Regras de UI:

1. Só providers com módulo enabled + `use_for_quote`.
2. Cada linha = uma `option` da facade `/freight/quote` (carrinho **não** chama módulos direto).
3. Pré-selecionar `store.freight.default_option` quando a cotação trouxer o `option_key`.
4. Ao mudar a seleção, atualizar `deliveryPrice` / total imediatamente.
5. **Definir como padrão**: confirmação curta → `PUT /freight/default-option`; toast; atualiza “Favorito atual”.
6. Se a favorita não estiver disponível na cotação (CEP sem cobertura), avisar e cair no fallback (mais barata).
7. Cores: Loggi `#1262FE`; destaque opcional para Correios `#FFD400`.
8. Durante loading: desabilitar botão criar pedido e a lista.

Persistir no pedido: `delivery_price`, `freight_carrier`, `freight_option` (JSON). **Não** alterar tags pelo frete escolhido.

---

## Desconto e Doação

Abaixo da tabela de itens (em versões anteriores):

- Input **Desconto (R$)**
- Input **Doação (R$)**

Linhas no resumo do total quando &gt; 0. Sem bloco de cupons.

## Informações e Tags

Manter campos manuais anteriores:

- **Informações** (`info`) — texto livre
- **Tags** — seleção/edição manual

**Não** adicionar/remover tag quando o frete muda.

## Modal Novo Prescritor

Campos mínimos (histórico `emptyProfessional`):

`name`, `lastname`, `type`, `phone`, `state`, `city`, `cpf`, `email`, `specialty`, `active`, `is_prescriber=true`, …

Salvar → `POST /items/professionals` → selecionar no form.

---

## Histórico

Colunas: data, status, itens (sem frete), total, ação “Comprar novamente”. 
Filtrar fora aguardando pagamento.

---

## Edição de pedido (`?p=`)

- Título do botão: **Alterar Pedido**
- Restaurar itens, desconto, doação, custom payments, prescritor, `freight_option` / carrier
- Não restaurar linha de item “Frete”
- Não inferir tags a partir do frete

---

## Página Pedidos (etiquetas) — nota de UI

Ações “Gerar etiqueta Loggi” / “Melhor Envio” só se `use_for_label` do provider. 
Default típico: só Loggi. Ver [flow.md](./flow.md) §8.

---

## Acessibilidade / estados

- Empty cart: frete oculto; botão criar desabilitado
- Sem associado: não criar
- Erro de cotação: mostrar `errorMessage` por carrier; fallback de seleção como no `CartFreightSelector` histórico
- Aviso pedido devolvido no histórico
