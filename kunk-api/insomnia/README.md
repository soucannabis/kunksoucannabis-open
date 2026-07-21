# Insomnia — Kunk API

Collection para testes manuais da API em `http://localhost:4250/api/v1`.

## Importar

1. Abra o Insomnia
2. **Application → Preferences → Data → Import Data** (ou *Create → Import*)
3. Selecione [`kunk-api.insomnia.json`](./kunk-api.insomnia.json)
4. Confirme o workspace **Kunk API**

## Ambiente

| Variável | Valor padrão |
|---|---|
| `base_url` | `http://localhost:4250/api/v1` |
| `email` | *(operador criado no Admin — não há seed de system_users)* |
| `password` | *(senha do operador)* |
| `bearer_token` | `kunk_live_demo_sample_token_do_not_use_prod` |

O `bearer_token` é o token fixo do sample-data (`users_api`). **Não precisa fazer login** para as rotas autenticadas — elas já usam `Authorization: Bearer`.

Para login por cookie, cadastre um operador no Admin e preencha `email` / `password` no ambiente.

IDs (`user_id`, `order_id`, `file_id`, etc.) devem ser ajustados com valores retornados pelas respostas.

## Fluxo sugerido

1. **0. Health → GET Health**
2. **Relations (validação)** — testa `include` / `patients` / FKs (preencha `user_code` e `professional_id` com UUIDs do sample)
3. **2. Items → GET List users / orders / products**
4. Demais pastas de domínio conforme o teste

Fluxo cookie (opcional, para testar sessão):

1. **1. Auth → POST Login (cookie)**
2. **1. Auth → GET Me (cookie)**

Não misture cookie e Bearer na mesma request — a API responde `AUTH_CONFLICT`.

## Pré-requisitos

```bash
cd kunk-api
docker compose up -d
npm run seed:sample   # se o banco estiver vazio (recria o token demo)
```
