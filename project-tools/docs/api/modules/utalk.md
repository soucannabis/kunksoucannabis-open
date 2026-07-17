# Módulo Utalk (Umbler)

No OSS o módulo sincroniza/transfere atendentes na triagem e, opcionalmente, envia uma **mensagem automática** quando o formulário público cria um contato.

## Diferença do legado

| Legado | OSS |
|---|---|
| Tokens por atendente para `POST /messages/simplified` | **Não** envia mensagem pelo Kunk |
| `UTALK_KEY` no env (token de um usuário) | Um `api_token` em Serviços externos (qualquer usuário Utalk) |
| `utalk_token` em `system_users` | Não usado nesta entrega |
| `utalk_id` por atendente | Mantido — `memberId` no transfer |

## Ativação

1. Admin → **Serviços externos → Utalk**
2. Preencher `api_token`, `organization_id` (e opcionalmente `api_base_url`)
3. Autenticar / testar
4. Ativar o módulo (`modules.utalk.enabled` no Admin)
5. Cadastrar `utalk_id` dos operadores Acolhimento/Administrador

Env fallback (credenciais apenas):

```bash
UTALK_API_TOKEN=
UTALK_ORG_ID=
# UTALK_API_URL=https://app-utalk.umbler.com/api/v1
```

## Mensagem da triagem

Quando o formulário público cria um `reception`, se:

1. Módulo `utalk` ativo
2. Flag `modules.utalk.triage_message_enabled=true`
3. Texto em `modules.utalk.triage_message`
4. Credencial `from_phone` preenchida
5. Contato informou telefone

→ envia `POST /messages/simplified/` para o WhatsApp do contato (fail-soft) e,
se a resposta trouxer `chat.id`, grava `reception.chat_id` e sincroniza o
`attendant` a partir do `organizationMember` do chat (via `utalk_id` em `system_users`).

Placeholders: `{{nome}}` / `{{name}}`, `{{telefone}}` / `{{phone}}`.

Configuração no Admin → Serviços externos → Utalk → **Mensagens da triagem**.

## API

Prefixo: `/api/v1/modules/utalk` (requer módulo ativo + sessão).

Teste de credenciais no Admin chama a Umbler `GET /v1/members/me/` (não existe `/users`).

| Método | Path | Descrição |
|---|---|---|
| `GET` | `/status` | enabled + presença de token/org |
| `GET` | `/chats/:id` | Detalhe do chat (Bearer do serviço) |
| `POST` | `/transfer` | `{ chatId, memberId }` → PUT Umbler |

Reception (com módulo ativo):

| Método | Path | Descrição |
|---|---|---|
| `PATCH` | `/reception/:id/chat` | `{ chat_id }` vincular/desvincular |
| `POST` | `/reception/:id/utalk-sync` | Sync attendant a partir do chat |
| `POST` | `/reception/utalk-sync-waiting` | Bulk na fila de espera |
| `PATCH` | `/reception/:id/attendant` | Assign local + transfer Utalk **fail-soft** (`utalk` no payload) |

Admin:

| Método | Path |
|---|---|
| `GET` | `/admin/external-services/utalk/attendants` |
| `PUT` | `/admin/external-services/utalk/attendants/:userCode` `{ utalk_id }` |

## Triagem (apps/kunk)

Com módulo on e token ok:

- Vincular `chat_id`, sync por linha, “Ver no Utalk”
- FAB sync em massa na aba de espera
- Assumir / transferir / remover dispara transfer no Umbler (token do serviço + `utalk_id` do destino)
