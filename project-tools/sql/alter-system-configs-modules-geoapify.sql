-- system_configs: Geoapify address validation flags (idempotent)
INSERT INTO system_configs (
  system, key, value, value_type, is_sensitive, is_required, allow_hardcoded, hardcoded_default, description
) VALUES
  (
    'modules',
    'modules.geoapify.enabled',
    'false',
    'boolean',
    false,
    false,
    false,
    NULL,
    'Módulo Geoapify habilitado (espelha MODULE_GEOAPIFY_ENABLED)'
  ),
  (
    'modules',
    'modules.geoapify.use_for_validation',
    'false',
    'boolean',
    false,
    false,
    false,
    NULL,
    'Usar Geoapify+ViaCEP na verificação de endereço dos pedidos'
  )
ON CONFLICT (system, key) DO NOTHING;
