# Módulos opcionais

Integrações de terceiros **desabilitadas por padrão**, ativáveis por env ou pela página de módulos do painel (manifesto §3.6).

## Prefixo

```
/api/v1/modules/{module}/...
```

## Módulos previstos

| Módulo | Env de ativação (exemplo) | Função |
|---|---|---|
| `pagarme` | `MODULE_PAGARME_ENABLED=true` + tokens | Pagamentos |
| `loggi` | `MODULE_LOGGI_ENABLED=true` | Frete / entrega |
| `melhorenvio` | `MODULE_MELHORENVIO_ENABLED=true` | Frete |
| `google_calendar` | `MODULE_GOOGLE_CALENDAR_ENABLED=true` | Agenda |
| `beeviral` | `MODULE_BEEVIRAL_ENABLED=true` | Afiliados |
| `utalk` | `MODULE_UTALK_ENABLED=true` | WhatsApp / chat |
| `pipefy` | `MODULE_PIPEFY_ENABLED=true` | Workflow externo (legado) |
| `brasilnfe` | `MODULE_BRASILNFE_ENABLED=true` | NF-e / DCE |
| `scp` | `MODULE_SCP_ENABLED=true` | Estoque externo |
| `nibo` | `MODULE_NIBO_ENABLED=true` | Financeiro |
| `geoapify` | `MODULE_GEOAPIFY_ENABLED=true` | Geocoding / verificação de endereço (ViaCEP + Geoapify) |

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

1. **Env** — variáveis necessárias presentes + `MODULE_*_ENABLED=true`
2. **Painel** — página de módulos grava config (fase posterior; pode espelhar em env/DB)

## Autorização

Além do módulo ativo, exigir:

- Sessão com role adequada, **ou**
- Scope `modules:{name}` no API token

## Papéis no frete (quote vs label)

Além de enabled, Loggi e Melhor Envio têm flags em `system_configs` (`system=modules`):

| Key | Default | Uso |
|---|---|---|
| `modules.loggi.use_for_quote` | `true` | Simulação no carrinho |
| `modules.loggi.use_for_label` | `true` | Geração de etiqueta em Pedidos |
| `modules.melhorenvio.use_for_quote` | `true` | Cotação Correios no carrinho |
| `modules.melhorenvio.use_for_label` | `false` | Etiqueta ME (off no legado SouCannabis) |
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
| `modules.google_calendar.use_for_scheduling` | `true` | Create/update/delete de eventos a partir de Serviços |
| `modules.google_calendar.primary_calendar_id` | `null` | Calendário principal da aplicação (admin) |

Spec: [`../frontend/kunk/servicos/README.md`](../frontend/kunk/servicos/README.md).  
Módulo: [`modules/google_calendar.md`](./modules/google_calendar.md).

## Documentação por módulo

| Módulo | Doc |
|---|---|
| Credenciais (todos) | [modules/credentials.md](./modules/credentials.md) |
| `loggi` | [modules/loggi.md](./modules/loggi.md) |
| `melhorenvio` | [modules/melhorenvio.md](./modules/melhorenvio.md) |
| `geoapify` | [modules/geoapify.md](./modules/geoapify.md) |
| `google_calendar` | [modules/google_calendar.md](./modules/google_calendar.md) |

Demais módulos: criar `docs/api/modules/{name}.md` na implementação. Este arquivo define o **contrato de ativação** comum.
