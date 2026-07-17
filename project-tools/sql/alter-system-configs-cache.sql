-- system_configs: operational memoryCache toggle (idempotent)
INSERT INTO system_configs (
  system, key, value, value_type, is_sensitive, is_required, allow_hardcoded, hardcoded_default, description
) VALUES
  (
    'cache',
    'cache.enabled',
    NULL,
    'boolean',
    false,
    false,
    true,
    'false',
    'Habilita memoryCache operacional (tags, produtos locais/remotos SC, atendentes). Desligado por padrão. Desligar limpa o cache do servidor.'
  )
ON CONFLICT (system, key) DO NOTHING;
