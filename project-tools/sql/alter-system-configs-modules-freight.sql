-- system_configs: modules freight flags (Loggi / Melhor Envio)
-- Idempotent

INSERT INTO system_configs (
  system, key, value, value_type, is_sensitive, is_required, allow_hardcoded, hardcoded_default, description
) VALUES
  (
    'modules',
    'modules.loggi.enabled',
    'false',
    'boolean',
    false,
    false,
    false,
    NULL,
    'Módulo Loggi habilitado (Admin → Serviços externos)'
  ),
  (
    'modules',
    'modules.loggi.use_for_quote',
    'true',
    'boolean',
    false,
    false,
    false,
    NULL,
    'Usar Loggi no cálculo de frete do carrinho'
  ),
  (
    'modules',
    'modules.loggi.use_for_label',
    'true',
    'boolean',
    false,
    false,
    false,
    NULL,
    'Usar Loggi na geração de etiqueta'
  ),
  (
    'modules',
    'modules.melhorenvio.enabled',
    'false',
    'boolean',
    false,
    false,
    false,
    NULL,
    'Módulo Melhor Envio habilitado'
  ),
  (
    'modules',
    'modules.melhorenvio.use_for_quote',
    'true',
    'boolean',
    false,
    false,
    false,
    NULL,
    'Usar Melhor Envio no cálculo de frete'
  ),
  (
    'modules',
    'modules.melhorenvio.use_for_label',
    'false',
    'boolean',
    false,
    false,
    false,
    NULL,
    'Usar Melhor Envio na geração de etiqueta (default off)'
  ),
  (
    'modules',
    'modules.freight.label_provider',
    'loggi',
    'string',
    false,
    false,
    false,
    NULL,
    'Provider preferido para geração de etiqueta'
  )
ON CONFLICT (system, key) DO NOTHING;
