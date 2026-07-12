# Analytics — API

Base: `/api/v1/analytics/*`  
Auth: sessão staff; permissão `reports:read`.

## Endpoints

| Método | Path | Domínio |
|---|---|---|
| `GET` | `/analytics/associates` | Associados (`users`) |
| `GET` | `/analytics/services` | Serviços |
| `GET` | `/analytics/orders` | Pedidos |
| `GET` | `/analytics/reception` | Triagem |

## Query params comuns

| Param | Tipo | Default |
|---|---|---|
| `start` | `YYYY-MM-DD` | início dos últimos 12 meses civis |
| `end` | `YYYY-MM-DD` | hoje |
| `group_by` | `day\|week\|month\|year` | `month` |
| `status` | string ou repetido | depende do domínio |
| `tags` | string ou repetido | opcional (services/orders/reception) |

Extras:

- Serviços: `type`, `professional_id`
- Triagem: `attendant`

## Resposta

```json
{
  "data": {
    "period": { "start": "…", "end": "…", "group_by": "month" },
    "kpis": {},
    "series": {},
    "rankings": {}
  }
}
```

### Associados

- Default: exclui pacientes (`status IS DISTINCT FROM 'patient'`) — alinhado à lista de Associados
- Filtro `Associado` aceita `Associado` (legado) e `active` (OSS)
- KPIs: `total`
- Séries: `by_date`, `by_state`, `by_age`, `by_gender`
- Data: `COALESCE(created_date, date_created)`

### Serviços

- KPIs: `total`, `donations_sum`, `donations_avg`, `payable_sum`, `association_fee_sum`
- Séries: `by_date`, `by_type`, `by_professional`
- Rankings: `top_associates`
- Payable/taxa: join `professionals` + catálogo `professional_types` / `report_settings`
- Data: `COALESCE(consultation_date, date_created)`

### Pedidos

- KPIs: `total`, `donations_sum`, `discounts_sum`, `freight_avg`
- Séries: `by_date`, `by_state` (`address->>'state'`)
- Rankings: `top_associates`, `top_products` (JSON `items`)

### Triagem

- KPIs: `total`, `to_orders`, `to_services`
- `to_orders` / `to_services` via `completion_reason` (`Pedido` / `Serviço`)
- Séries: `by_date`, `by_attendant`

## Client

`packages/api-client`:

- `getAnalyticsAssociates(qs)`
- `getAnalyticsServices(qs)`
- `getAnalyticsOrders(qs)`
- `getAnalyticsReception(qs)`
