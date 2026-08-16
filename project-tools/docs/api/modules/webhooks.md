# Webhooks outbound

Notificações HTTP configuráveis pelo Admin (`/webhooks`). A instalação envia `POST` JSON para URLs cadastradas quando mutações ocorrem em tabelas selecionadas.

## Escopo v1

| Tabelas | Ações |
|---------|-------|
| `users`, `orders`, `services`, `reception` | `create`, `update`, `delete` |

## Admin API

Base: `/api/v1/admin/webhooks` (role `Administrador`).

| Método | Path | Descrição |
|--------|------|-----------|
| `GET` | `/catalog` | Tabelas/ações permitidas |
| `GET` | `/` | Lista endpoints (sem secret) |
| `POST` | `/` | Cria; resposta inclui `secret` plaintext **uma vez** |
| `PATCH` | `/:id` | Atualiza nome/url/tables/actions/enabled |
| `POST` | `/:id/rotate-secret` | Novo secret (reveal uma vez) |
| `DELETE` | `/:id` | Remove endpoint e deliveries |
| `POST` | `/:id/test` | Enfileira evento `ping`/`test` |
| `GET` | `/:id/deliveries` | Histórico recente |

## Entrega HTTP

- Método: `POST`
- `Content-Type: application/json`
- Timeout: 15s
- Retries: até 8, backoff exponencial (~15s × 2^n, cap 1h)
- Status 2xx → `delivered`; demais / timeout → `failed` e reagenda; esgotou → `dead`

### Headers

| Header | Conteúdo |
|--------|----------|
| `X-Kunk-Event` | UUID do evento |
| `X-Kunk-Delivery` | ID da delivery |
| `X-Kunk-Table` | Tabela (ou `ping` no teste) |
| `X-Kunk-Action` | Ação (ou `test`) |
| `X-Kunk-Timestamp` | Unix seconds |
| `X-Kunk-Signature` | `sha256=<hex>` de HMAC-SHA256(`{timestamp}.{rawBody}`, secret) |

### Payload

```json
{
  "id": "evt_<uuid>",
  "table": "orders",
  "action": "update",
  "record_id": "123",
  "occurred_at": "2026-08-10T18:00:00.000Z",
  "data": { }
}
```

- `create` / `delete`: `data` traz o registro (sanitizado).
- `update`: `data` traz **apenas os campos alterados**, sempre incluindo a PK (`id` / chave da tabela).
- Campos sensíveis (`account_password`, `session_token`, etc.) são removidos de `data`.

## Persistência

- `webhook_endpoints` — URL, secret cifrado (`CONFIG_ENCRYPT_KEY`), tables/actions, enabled
- `webhook_deliveries` — outbox + log

DDL: `project-tools/sql/alter-webhooks.sql` (aplicado também via `ensureWebhooks` no boot).

## Disparo

- Mutações via `itemsRepository` nas tabelas v1
- `ordersService.updateStatus` (SQL direto)
- Atualizações em lote de acolhimento (`completeOpenByAssociate`)

Emit é fail-soft: falha ao enfileirar não quebra a operação de domínio.

## Testes

```bash
npm test --prefix kunk-api -- --test-name-pattern=webhook
```
