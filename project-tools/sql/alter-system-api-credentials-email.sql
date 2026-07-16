-- Email (SMTP) credentials metadata (idempotent)
INSERT INTO system_api_credentials (
  service, field_key, encrypted_value, env_fallback, is_secret, description
) VALUES
  ('email', 'host', NULL, 'SMTP_HOST', false, 'Servidor SMTP (ex.: smtp.example.com)'),
  ('email', 'port', NULL, 'SMTP_PORT', false, 'Porta SMTP (ex.: 587 ou 465)'),
  ('email', 'secure', NULL, 'SMTP_SECURE', false, 'TLS implícito (true para porta 465)'),
  ('email', 'user', NULL, 'SMTP_USER', false, 'Usuário SMTP'),
  ('email', 'pass', NULL, 'SMTP_PASS', true, 'Senha SMTP'),
  ('email', 'from_email', NULL, 'SMTP_FROM', false, 'Remetente (From)'),
  ('email', 'from_name', NULL, 'SMTP_FROM_NAME', false, 'Nome do remetente')
ON CONFLICT (service, field_key) DO NOTHING;
