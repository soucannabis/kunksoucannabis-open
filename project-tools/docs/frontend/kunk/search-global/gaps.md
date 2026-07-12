# Search global — Gaps e checklist

## Decisões fechadas

| # | Decisão |
|---|---|
| 1 | Layout FAB + Dialog **igual ao legado** |
| 2 | Quatro entidades: users, orders, services, reception |
| 3 | Abrir em **nova aba** com deep link |
| 4 | Associados: abrir cadastramento + ação Triagem |
| 5 | Paciente na busca → abre **responsável** (`open_user_code`) |
| 6 | Triagem OSS: `/app/acolhimento/triagem?t=` |
| 7 | Pedidos: modo nome vs tracking; deep link `OrdersPage?p={order_code}` |
| 8 | Serviços: `?s=` + `?h=` (filtro/highlight); sem Beeviral |
| 9 | Anotações/search independente do CRUD de associados |

## Checklist

- [ ] `GET /search` na kunk-api + testes
- [ ] `GlobalAppSearch` no shell Theme
- [ ] Deep links: `?a=` cadastramento; `?p=` **OrdersPage**; `?s=`/`?h=` serviços; `?t=` triagem
- [ ] Botão Triagem (POST reception)
- [ ] `gs_meta` para pacientes
- [ ] RBAC leitura das collections

## Bloqueantes

Nenhum — associados e search no mesmo epic recomendado.
