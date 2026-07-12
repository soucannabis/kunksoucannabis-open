# Credenciais de API (`system_api_credentials`)

> Armazenamento de secrets de integrações externas, separado dos valores públicos de `system_configs`, com criptografia at-rest e política write-only para o frontend.

## Motivação

`system_configs` já tem `is_sensitive`, mas misturar flags de loja com tokens OAuth dificulta:

- Assistentes multi-campo por serviço
- Status de teste por campo/serviço
- Garantia de que o front **nunca** recebe a chave após gravação
- Tokens OAuth (`access_token` / `refresh_token`) com ciclo de vida próprio

Nova tabela relacionada semanticamente aos módulos / `system_configs` (`system=modules`).

## Schema

```sql
CREATE TABLE IF NOT EXISTS system_api_credentials (
  id SERIAL PRIMARY KEY,
  service VARCHAR(64) NOT NULL,
  field_key VARCHAR(128) NOT NULL,
  encrypted_value TEXT,
  env_fallback VARCHAR(128),
  is_secret BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  last_tested_at TIMESTAMPTZ,
  last_test_ok BOOLEAN,
  date_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_updated TIMESTAMPTZ,
  UNIQUE (service, field_key)
);

CREATE INDEX IF NOT EXISTS idx_system_api_credentials_service
  ON system_api_credentials (service);
```

Criptografia: AES-256-GCM com `CONFIG_ENCRYPT_KEY` (mesmo mecanismo de configs sensíveis).

## Cascata de resolução (somente server)

```
1. encrypted_value no DB  → decrypt
2. process.env[env_fallback]
3. ausente → CREDENTIAL_MISSING
```

## Contrato com o frontend

### Nunca retornar

- `encrypted_value`
- plaintext de qualquer `is_secret=true`
- access/refresh tokens

### Sempre retornar (metadados)

```json
{
  "service": "loggi",
  "field_key": "client_secret",
  "is_secret": true,
  "has_value": true,
  "source": "db",
  "env_fallback": "LOGGI_CLIENT_SECRET",
  "env_present": false,
  "description": "Client Secret Loggi",
  "last_tested_at": null,
  "last_test_ok": null
}
```

`source`: `db` | `env` | `empty`  
Se `source=env`, UI: “Configurado via ambiente (`LOGGI_CLIENT_SECRET`)”.

### Escrita

```http
PUT /admin/external-services/loggi/credentials
```

```json
{
  "fields": {
    "client_id": "…",
    "client_secret": "…",
    "company_id": "…"
  },
  "run_test": true
}
```

- Campo secret omitido ou `""` → manter valor atual
- Campo secret com novo valor → criptografar e substituir
- Após write com `run_test: true` → executar teste; **só persistir se ok**; atualizar `last_tested_at` / `last_test_ok`
- Se teste falhar → **não salvar** o novo secret; manter valor anterior; retornar erro

### Alterar chave

UI mostra input vazio + placeholder “Nova chave” (nunca o valor antigo).  
Submit só envia campos que o usuário preencheu.

### Remover valor DB

```http
DELETE /admin/external-services/loggi/credentials/client_secret
```

Volta a cascata para env (se existir).

## Seed de metadados (sem secrets)

Inserir rows com `encrypted_value=NULL` e `env_fallback` preenchido para o assistente listar campos mesmo sem valor:

| service | field_key | env_fallback | is_secret |
|---|---|---|---|
| loggi | client_id | LOGGI_CLIENT_ID | true |
| loggi | client_secret | LOGGI_CLIENT_SECRET | true |
| loggi | company_id | LOGGI_COMPANY_ID | false |
| loggi | api_base_url | LOGGI_URL_API | false |
| loggi | token_url | LOGGI_TOKEN_URL | false |
| melhorenvio | client_id | MELHOR_ENVIO_CLIENT_ID | true |
| melhorenvio | client_secret | MELHOR_ENVIO_CLIENT_SECRET | true |
| melhorenvio | redirect_uri | MELHOR_ENVIO_REDIRECT_URI | false |
| melhorenvio | api_base_url | MELHOR_ENVIO_API_URL | false |
| melhorenvio | access_token | — | true |
| melhorenvio | refresh_token | — | true |

Tokens ME são preenchidos só pelo callback OAuth (não pelo form manual, exceto “limpar”).

## Assistente — regras

1. Schema de campos vem da API (`fields_schema` no GET do serviço).
2. Campos required vazios (sem db e sem env) → bloqueia “Concluir”.
3. Ao salvar secrets → teste obrigatório; **falha = não grava**.
4. Se precisar de OAuth (Melhor Envio), o assistente tem passo “Autorizar” antes do teste completo.
5. Resultado do teste exibido inline; falhas não revelam pedaços do secret.

## Segurança

| Regra | Detalhe |
|---|---|
| Encrypt at rest | `CONFIG_ENCRYPT_KEY` obrigatória em prod se houver secrets no DB |
| Audit | Opcional: `system_activity` em create/update/delete de credentials |
| RBAC | Só `Administrador` |
| Logs | Nunca logar plaintext nem ciphertext completo |
| `/config/public` | Não inclui credentials |
| Items whitelist | **Não** expor `system_api_credentials` via `/items` |

## Relação com `system_configs`

```
system_configs (system=modules)
  modules.loggi.enabled
  modules.loggi.use_for_quote
  modules.loggi.use_for_label
  …

system_api_credentials (service=loggi)
  client_id, client_secret, company_id, …
```

Flags e papéis ≠ secrets. O módulo lê ambos no bootstrap da request.
