# Clientes institucionais — API

## Domínio `/api/v1/institutional-clients`

| Método | Path | Ação |
|---|---|---|
| GET | `/` | Lista (`limit`, `sort`, filters) |
| GET | `/search?q=` | Busca (min 2 chars) |
| GET | `/by-code/:client_code` | Por código público |
| GET | `/:id` | Por id |
| GET | `/:id/history` | Pedidos do cliente |
| POST | `/` | Criar (valida empresa/representante/endereço) |
| PATCH | `/:id` | Atualizar |
| DELETE | `/:id` | Excluir (409 se houver pedidos) |

RBAC collection: `institutional_clients` (CRUD Admin/Acolhimento; R Produção/Financeiro).

## Pedidos

`POST /orders` aceita:

```json
{
  "institutional_client_id": 1,
  "institutional_client_code": "uuid",
  "items": [],
  "address": {}
}
```

Sem `user` / `user_code`. O servidor preenche `associate_name` / `receiver_name` a partir do cadastro.

`GET /orders/:id` (detalhes) inclui `institutional_client: { id, client_code, name, document, phone, email, … }` quando aplicável.

## Client (`@kunk/api-client`)

`listInstitutionalClients`, `searchInstitutionalClients`, `getInstitutionalClientByCode`, `getInstitutionalClient`, `getInstitutionalClientHistory`, `createInstitutionalClient`, `updateInstitutionalClient`, `deleteInstitutionalClient`.
