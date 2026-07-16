-- Pagar.me credentials metadata (idempotent)
INSERT INTO system_api_credentials (
  service, field_key, encrypted_value, env_fallback, is_secret, description
) VALUES
  ('pagarme', 'secret_key', NULL, 'PAGARME_SECRET_KEY', true, 'Chave secreta Pagar.me (alias PAGARME_TOKEN)'),
  ('pagarme', 'public_key', NULL, 'PAGARME_PUBLIC_KEY', false, 'Chave pública Pagar.me (opcional)'),
  ('pagarme', 'api_base_url', NULL, 'PAGARME_URL_API', false, 'Base URL API v5 (default https://api.pagar.me/core/v5)'),
  ('pagarme', 'webhook_user', NULL, 'PAGARME_WEBHOOK_USER', false, 'Usuário HTTP Basic do webhook (visível no Admin)'),
  ('pagarme', 'webhook_pass', NULL, 'PAGARME_WEBHOOK_PASS', true, 'Senha HTTP Basic do webhook')
ON CONFLICT (service, field_key) DO NOTHING;
