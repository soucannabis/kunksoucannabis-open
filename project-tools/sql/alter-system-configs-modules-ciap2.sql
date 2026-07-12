-- system_configs: CIAP-2 module flag (idempotent). Default enabled.
INSERT INTO system_configs (
  system, key, value, value_type, is_sensitive, is_required, allow_hardcoded, hardcoded_default, description
) VALUES
  (
    'modules',
    'modules.ciap2.enabled',
    'true',
    'boolean',
    false,
    false,
    false,
    'true',
    'Módulo CIAP-2 habilitado no Kunk e no cadastramento'
  )
ON CONFLICT (system, key) DO NOTHING;
