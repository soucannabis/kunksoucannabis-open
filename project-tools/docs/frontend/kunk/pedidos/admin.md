# Pedidos / Carrinho — Admin

## Áreas no `apps/admin`

| Rota | Conteúdo |
|---|---|
| `/loja` | Índice da área Loja |
| `/loja/frete` | Aplicar frete no total, pacote padrão, remetente |
| `/servicos-externos` | Lista Loggi, Melhor Envio, … — enable/disable |
| `/servicos-externos/:service` | Assistente de configuração + teste |

Papel: apenas `Administrador`.

Atualizar nav do admin e [`flow.md`](../../admin/flow.md) com essas rotas.

---

## 1. Loja (`/loja` + `/loja/frete`)

### Objetivos

Tudo que a cotação e a etiqueta precisam de **origem** e **embalagem** vem daqui — **nunca** hardcode no código (legado: endereço Anápolis; dims fixas).

| Config | Key | Obrigatório |
|---|---|---|
| Aplicar frete no total | `store.freight.apply_to_total` | sim (default `true`) |
| **Quem envia (remetente)** | `store.ship_from` | **sim** — bloqueia cotação/etiqueta se incompleto |
| **Dimensões da caixa / pacote** | `store.freight.package` | **sim** — idem |
| **Declaração de conteúdo** | `store.freight.content_declaration` | **sim** para etiqueta (compartilhada Loggi + ME) |
| Entrega padrão (favorito) | `store.freight.default_option` | não |

Remetente, caixa e declaração de conteúdo são **compartilhados** por Loggi e Melhor Envio.

### UX — seções do formulário

#### 1. Frete no carrinho

- Switch **Aplicar valor do frete no total do carrinho** (default ligado).
- Ajuda: desligado = simula sem somar no total.

#### 2. Remetente / quem envia os pedidos (`store.ship_from`)

| Campo | Tipo | Obrigatório |
|---|---|---|
| Nome / razão social | text | sim |
| Telefone | text | sim |
| CPF/CNPJ (`federal_tax_id`) | text | sim |
| Rua / logradouro | text | sim |
| Número | text | sim |
| Complemento | text | não |
| Bairro | text | sim |
| Cidade | text | sim |
| UF | select | sim |
| CEP | text (8 dígitos) | sim |
| País | text | sim (default `Brasil`) |

Validação no save: CEP 8 dígitos; telefone e documento só dígitos no DB.  
Banner se incompleto: “Cotação e etiquetas ficam indisponíveis até preencher o remetente.”

#### 3. Dimensões da caixa (`store.freight.package`)

| Campo | Unidade | Obrigatório | Default no código |
|---|---|---|---|
| Peso | gramas (`weight_g`) | sim | **nenhum** — admin informa |
| Comprimento | cm (`length_cm`) | sim | nenhum |
| Largura | cm (`width_cm`) | sim | nenhum |
| Altura | cm (`height_cm`) | sim | nenhum |

Sem preenchimento → cotação/etiqueta indisponíveis (`CONFIG_INCOMPLETE`).  
Opcional: `label_package` só para etiqueta diferente da cotação.

Ajuda: “Informe peso e medidas da embalagem real. Não há valor padrão no sistema.”

#### 4. Declaração de conteúdo (`store.freight.content_declaration`)

Compartilhada por **todos** os módulos de entrega:

| Campo | Obrigatório |
|---|---|
| Descrição (`description`) | sim (para etiqueta) |
| Valor declarado (`total_value`) | sim |

Ajuda: “Usado na cotação (seguro/valor declarado) e na etiqueta Loggi/Melhor Envio. Uma config para ambos.”

#### 5. Entrega padrão (favorito)

- Select em cascata:
  - `GET /modules/loggi/service-options` → ex.: `Loggi > Econômico`
  - `GET /modules/melhorenvio/service-options` → ex.: `Melhor Envio > Correios > PAC`
- Preview do label + limpar favorito
- Também gravável pelo carrinho (“Definir como padrão”) por **qualquer** operador com acesso ao carrinho — ver [ui-ux.md](./ui-ux.md)

#### 6. Salvar

`PATCH /config/:id` para cada key alterada (`system=store`).  
Não misturar secrets de API aqui.

---

## 2. Serviços externos (`/servicos-externos`)

### Lista

Cards/linhas por serviço conhecido:

| Serviço | Descrição curta |
|---|---|
| Loggi | Modalidades Econômico / Expresso + etiquetas |
| Melhor Envio | Transportadoras e serviços (Correios PAC/Sedex, Azul, …) + etiquetas opcional |
| Pagar.me | Checkout pedidos/serviços — ver [`../pagamentos-soucannabis/admin.md`](../pagamentos-soucannabis/admin.md) |
| Pedidos SouCannabis | Catálogo/tags/sync + split (requer Pagarme) — idem |

Cada card:

- Switch **Habilitado** (`modules.{service}.enabled` + espelho `MODULE_*_ENABLED` se aplicável)
- Checkboxes:
  - Usar em **cálculo de frete** (`use_for_quote`)
  - Usar em **geração de etiqueta** (`use_for_label`)
- Badge de status das credenciais: `não configurado` | `env` | `configurado` | `teste ok` | `teste falhou`
- Botão **Configurar** → assistente de API keys
- Botão **Testar** (se já houver credencial/env)

> Declaração de conteúdo **não** aparece aqui — fica em `/loja/frete` (compartilhada).

### Default de papéis (legado SouCannabis)

| Serviço | Quote | Label |
|---|---|---|
| Loggi | ✓ | ✓ |
| Melhor Envio | ✓ | ✗ |

O admin pode alterar (ex.: gerar etiqueta só via Melhor Envio).

---

## 3. Assistente de configuração (`/servicos-externos/:service`)

### Princípios

1. Pedir **todos** os campos necessários à conexão (não só a API key).
2. Após primeira gravação, campos secretos mostram apenas “••••••••” / “Chave configurada” + botão **Alterar**.
3. **Nunca** GET devolve o valor em claro.
4. Ao salvar (ou ao confirmar alteração de qualquer secret), chamar automaticamente `POST /modules/{service}/test`.
5. **Só persiste a credencial se o teste passar.** Se falhar: não grava o novo valor; mantém o anterior; exibe erro e deixa o assistente aberto.
6. Se a chave já veio de **env**, o assistente mostra: “Detectada via ambiente (`LOGGI_CLIENT_SECRET`)” sem revelar o valor; permite sobrescrever gravando no DB (passa a `source=db`) — também só após teste ok.

### Passos Loggi

1. `client_id`, `client_secret`, `company_id`
2. Opcional: `api_base_url`, `token_url` (defaults prod)
3. Salvar → teste → só commit se ok

### Passos Melhor Envio

1. `client_id`, `client_secret`, `redirect_uri`
2. Ambiente: produção / sandbox (`api_base_url`)
3. Botão **Autorizar no Melhor Envio** → abre `GET /modules/melhorenvio/oauth/authorize`
4. Callback grava tokens criptografados
5. Teste: `oauth/status` + cotação para CEP de teste (tokens OAuth só ficam se fluxo completar)

### Campos não secretos

Podem ser editados e reexibidos (`company_id`, `redirect_uri`, URLs).

---

## Persistência

| Dado | Onde |
|---|---|
| apply_to_total, ship_from, package, content_declaration, default_option | `system_configs` `system=store` |
| enabled / use_for_quote / use_for_label | `system_configs` `system=modules` |
| Secrets e tokens | `system_api_credentials` (só se teste ok) |

Seed SQL (implementação):

- `project-tools/sql/alter-system-configs-store.sql`
- `project-tools/sql/create-system-api-credentials.sql`
- `project-tools/sql/alter-system-configs-modules-freight.sql`

---

## Fora destas áreas

- CRUD de `orders` / `products` / `professionals` continua em **Dados**.
- Operação diária do carrinho e etiquetas: `apps/kunk`.
- Aparência do Kunk: `/aparencia` (não misturar).
