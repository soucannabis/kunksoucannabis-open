-- system_configs: tracking flags for Loggi / Melhor Envio (coexist with SC)
-- Idempotent

INSERT INTO system_configs (
  system, key, value, value_type, is_sensitive, is_required, allow_hardcoded, hardcoded_default, description
) VALUES
  (
    'modules',
    'modules.loggi.use_for_tracking',
    'false',
    'boolean',
    false,
    false,
    false,
    NULL,
    'Usar Loggi só para consulta de código de rastreio (ok com Pedidos SC)'
  ),
  (
    'modules',
    'modules.melhorenvio.use_for_tracking',
    'false',
    'boolean',
    false,
    false,
    false,
    NULL,
    'Usar Melhor Envio só para consulta de código de rastreio (ok com Pedidos SC)'
  )
ON CONFLICT (system, key) DO NOTHING;
