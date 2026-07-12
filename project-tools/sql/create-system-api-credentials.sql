-- system_api_credentials: encrypted API secrets for external services
-- Idempotent

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

-- Metadata seed (no secrets)
INSERT INTO system_api_credentials (
  service, field_key, encrypted_value, env_fallback, is_secret, description
) VALUES
  ('loggi', 'client_id', NULL, 'LOGGI_CLIENT_ID', true, 'Loggi OAuth client_id'),
  ('loggi', 'client_secret', NULL, 'LOGGI_CLIENT_SECRET', true, 'Loggi OAuth client_secret'),
  ('loggi', 'company_id', NULL, 'LOGGI_COMPANY_ID', false, 'Loggi company id'),
  ('loggi', 'api_base_url', NULL, 'LOGGI_URL_API', false, 'Loggi API base URL'),
  ('loggi', 'token_url', NULL, 'LOGGI_TOKEN_URL', false, 'Loggi OAuth token URL'),
  ('melhorenvio', 'client_id', NULL, 'MELHOR_ENVIO_CLIENT_ID', true, 'Melhor Envio OAuth client_id'),
  ('melhorenvio', 'client_secret', NULL, 'MELHOR_ENVIO_CLIENT_SECRET', true, 'Melhor Envio OAuth client_secret'),
  ('melhorenvio', 'redirect_uri', NULL, 'MELHOR_ENVIO_REDIRECT_URI', false, 'Melhor Envio OAuth redirect URI'),
  ('melhorenvio', 'api_base_url', NULL, 'MELHOR_ENVIO_API_URL', false, 'Melhor Envio API base URL'),
  ('melhorenvio', 'access_token', NULL, NULL, true, 'Melhor Envio access token (OAuth)'),
  ('melhorenvio', 'refresh_token', NULL, NULL, true, 'Melhor Envio refresh token (OAuth)')
ON CONFLICT (service, field_key) DO NOTHING;
