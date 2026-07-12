-- Melhor Envio: environment flag (sandbox | production). Default sandbox.
INSERT INTO system_api_credentials (
  service, field_key, encrypted_value, env_fallback, is_secret, description
) VALUES
  ('melhorenvio', 'environment', NULL, 'MELHOR_ENVIO_ENVIRONMENT', false, 'Ambiente Melhor Envio: sandbox ou production')
ON CONFLICT (service, field_key) DO NOTHING;
