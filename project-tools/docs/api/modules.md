# Módulos opcionais

Integrações de terceiros **desabilitadas por padrão**, ativáveis apenas pelo Admin (Serviços externos → `system_configs` `modules.*.enabled`).

## Prefixo

```
/api/v1/modules/{module}/...
```

## Módulos previstos

| Módulo | Ativação | Função |
|---|---|---|
| `pagarme` | Admin + tokens | Pagamentos (pedidos/serviços) — [pagarme.md](./modules/pagarme.md) |
| `soucannabis_orders` | Admin + OAuth | Pedidos SouCannabis (catálogo/tags/sync + split) — [soucannabis_orders.md](./modules/soucannabis_orders.md); **requer** `pagarme` |
| `loggi` | Admin | Frete / entrega |
| `melhorenvio` | Admin | Frete |
| `google_calendar` | Admin | Agenda |
| `beeviral` | Admin | Afiliados |
| `utalk` | Admin | WhatsApp / chat (triagem: sync + transfer) — [utalk.md](./modules/utalk.md) |
| `pipefy` | Admin | Workflow externo (legado) |
| `brasilnfe` | Admin | NF-e / DCE |
| `scp` | Admin | Estoque externo |
| `nibo` | Admin | Financeiro |
| `geoapify` | Admin | Geocoding / verificação de endereço (ViaCEP + Geoapify) |
| `email` | Admin | Envio de e-mails — ver [email.md](./modules/email.md) |

Lista alinhada ao kunkserver atual; o OSS pode reduzir o conjunto “core”.

## Comportamento se desabilitado

```http
GET /modules/loggi/quote
→ 503
```

```json
{
  "data": null,
  "meta": null,
  "errors": [
    {
      "code": "MODULE_DISABLED",
      "message": "Módulo loggi não está ativo nesta instalação"
    }
  ]
}
```

## Ativação

1. **Admin** — Serviços externos → interruptor **Módulo ativo** (`modules.{name}.enabled` em `system_configs`)
2. Credenciais em `system_api_credentials` (ou fallbacks `*_API_KEY` / `SMTP_*` no `.env` quando aplicável)

Sem valor no Admin → módulo **desligado**.

## Autorização

Além do módulo ativo, exigir:

- Sessão com role adequada, **ou**
- Scope `modules:{name}` no API token

## Papéis no frete (quote vs label)

Além de enabled, Loggi e Melhor Envio têm flags em `system_configs` (`system=modules`):

| Key | Default | Uso |
|---|---|---|
| `modules.loggi.use_for_quote` | `false` | Simulação no carrinho |
| `modules.loggi.use_for_label` | `false` | Geração de etiqueta em Pedidos |
| `modules.melhorenvio.use_for_quote` | `false` | Cotação Correios no carrinho |
| `modules.melhorenvio.use_for_label` | `false` | Etiqueta ME |
| `modules.freight.label_provider` | `loggi` | Provider preferido para etiqueta |

Spec do carrinho: [`../frontend/kunk/pedidos/README.md`](../frontend/kunk/pedidos/README.md).  
Favorito de entrega: `store.freight.default_option` (ex. `Melhor Envio > Correios > PAC`, `Loggi > Econômico`).  
Credenciais: [`modules/credentials.md`](./modules/credentials.md).

## Catálogo de modalidades (para favoritos)

| Provider | Como obter opções |
|---|---|
| Loggi | Cotação retorna `FREIGHT_TYPE_ECONOMIC` / `FREIGHT_TYPE_EXPRESS`; `GET /modules/loggi/service-options` espelha o enum (não há list-services oficial) |
| Melhor Envio | `GET /modules/melhorenvio/companies` + `/services` (upstream `/me/shipment/companies` e `/services`) |

## Papéis no agendamento (Google Calendar)

| Key | Default | Uso |
|---|---|---|
| `modules.google_calendar.use_for_scheduling` | `false` | Create/update/delete de eventos a partir de Serviços |
| `modules.google_calendar.primary_calendar_id` | `null` | Calendário principal da aplicação (admin) |

Spec: [`../frontend/kunk/servicos/README.md`](../frontend/kunk/servicos/README.md).  
Módulo: [`modules/google_calendar.md`](./modules/google_calendar.md).

## Papéis em pagamentos / Pedidos SouCannabis

| Key | Default | Uso |
|---|---|---|
| `modules.pagarme.use_for_orders` | `false` | PaymentModal em pedidos |
| `modules.pagarme.use_for_services` | `false` | PaymentModal em serviços |
| `modules.pagarme.soucannabis_recipient_id` | `null` | Recipient SC no split |
| `modules.soucannabis_orders.sync_products` | `false` | Catálogo remoto no carrinho |
| `modules.soucannabis_orders.sync_tags` | `false` | Seção Tags SouCannabis |
| `modules.soucannabis_orders.sync_orders` | `false` | Sync de pedidos (create só após pago) |

Ativar SC exige conta Pagarme da associação **PSP** + `payment_percentage` **inteiro** (ver módulos).

Spec: [`../frontend/kunk/pagamentos-soucannabis/README.md`](../frontend/kunk/pagamentos-soucannabis/README.md).  
Contrato remoto SC: [`../external_apps_kunk_doc.md`](../external_apps_kunk_doc.md).  
Módulos: [`modules/pagarme.md`](./modules/pagarme.md) · [`modules/soucannabis_orders.md`](./modules/soucannabis_orders.md).

## Documentação por módulo

| Módulo | Doc |
|---|---|
| Credenciais (todos) | [modules/credentials.md](./modules/credentials.md) |
| `loggi` | [modules/loggi.md](./modules/loggi.md) |
| `melhorenvio` | [modules/melhorenvio.md](./modules/melhorenvio.md) |
| `geoapify` | [modules/geoapify.md](./modules/geoapify.md) |
| `google_calendar` | [modules/google_calendar.md](./modules/google_calendar.md) |
| `email` | [modules/email.md](./modules/email.md) |
| `pagarme` | [modules/pagarme.md](./modules/pagarme.md) |
| `soucannabis_orders` | [modules/soucannabis_orders.md](./modules/soucannabis_orders.md) |

Demais módulos: criar `docs/api/modules/{name}.md` na implementação. Este arquivo define o **contrato de ativação** comum.
