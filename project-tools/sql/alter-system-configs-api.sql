-- system_configs: API access feature flag (idempotent). Default disabled.
INSERT INTO system_configs (
  system, key, value, value_type, is_sensitive, is_required, allow_hardcoded, hardcoded_default, description
) VALUES
  (
    'api',
    'api.enabled',
    'false',
    'boolean',
    false,
    false,
    true,
    'false',
    'Habilita autenticação Bearer e gestão de tokens de API no Admin'
  )
ON CONFLICT (system, key) DO NOTHING;
