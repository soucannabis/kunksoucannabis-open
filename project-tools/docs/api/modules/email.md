# E-mail (SMTP)

Envio de e-mails da instalação via SMTP (Nodemailer), configurável no Admin e/ou por variáveis de ambiente.

## Habilitação

1. Admin → Serviços externos → E-mail → interruptor **Módulo ativo** (sobrescreve o env)
2. Credenciais SMTP em `system_api_credentials` **ou** fallbacks `SMTP_*`
3. Opcional: `MODULE_EMAIL_ENABLED` no `.env` só como padrão quando o Admin ainda não gravou `modules.email.enabled`

Precedência: **Admin > env**.

## Credenciais

| field_key | secreto | env_fallback |
|-----------|---------|--------------|
| host | não | SMTP_HOST |
| port | não | SMTP_PORT |
| secure | não | SMTP_SECURE |
| user | sim | SMTP_USER |
| pass | sim | SMTP_PASS |
| from_email | não | SMTP_FROM |
| from_name | não | SMTP_FROM_NAME |

Cascata: DB criptografado → `env_fallback` → ausente.

## Admin

- `PUT /admin/external-services/email/credentials` — salva e testa conexão (VERIFY)
- `POST /admin/external-services/email/test` — revalida conexão
- `POST /admin/external-services/email/test-email` — body `{ "to": "you@example.com" }` envia mensagem padrão de teste

## URLs públicas (links nos e-mails)

| Env | Uso |
|-----|-----|
| KUNK_PUBLIC_URL | Convite operador / portal profissional / reset kunk |
| ADMIN_PUBLIC_URL | Reset senha Admin |
| REGISTRATION_PUBLIC_URL | Reset senha associado |
| DOC_SIGN_PUBLIC_URL | Reset doc-sign + links de assinatura (também via env legado) |

## Consumidores

- Reset de senha associado e operador
- Convite de operador (Admin) e portal profissional
- Doc-sign: link na criação do termo; confirmação + PDFs após assinatura; `POST /doc-sign/contracts/:id/resend-email`

Quando SMTP não está configurado / módulo off, os fluxos de negócio continuam e o envio retorna `skipped` / `email_status` correspondente.
