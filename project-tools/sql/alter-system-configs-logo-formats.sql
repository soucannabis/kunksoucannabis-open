-- Logos: formatos square (1:1) e rectangular (3:1) + preferência ativa.
-- Idempotent — DB → env → hardcoded cascade; public (is_sensitive=false)

INSERT INTO system_configs (
  system, key, value, value_type, is_sensitive, is_required, allow_hardcoded, hardcoded_default, description
) VALUES
  (
    'registration',
    'VITE_ASSOCIATION_LOGO_SQUARE',
    NULL,
    'string',
    false,
    false,
    true,
    '',
    'Logo quadrada (1:1) da associação'
  ),
  (
    'registration',
    'VITE_ASSOCIATION_LOGO_RECTANGULAR',
    NULL,
    'string',
    false,
    false,
    true,
    '',
    'Logo retangular (3:1) da associação'
  ),
  (
    'registration',
    'VITE_ASSOCIATION_LOGO_FORMAT',
    NULL,
    'string',
    false,
    false,
    true,
    'square',
    'Formato de logo ativo nos apps: square | rectangular'
  )
ON CONFLICT (system, key) DO NOTHING;

-- Migra logo legada para square quando square ainda está vazio.
UPDATE system_configs AS square
SET
  value = legacy.value,
  date_updated = NOW()
FROM system_configs AS legacy
WHERE square.system = 'registration'
  AND square.key = 'VITE_ASSOCIATION_LOGO_SQUARE'
  AND (square.value IS NULL OR TRIM(square.value) = '')
  AND legacy.system = 'registration'
  AND legacy.key = 'VITE_ASSOCIATION_LOGO'
  AND legacy.value IS NOT NULL
  AND TRIM(legacy.value) <> ''
  AND legacy.value NOT ILIKE '%/logo.svg';
