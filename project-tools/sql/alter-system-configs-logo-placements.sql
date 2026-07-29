-- Logo placements: tipo + largura por app (login/menu).
-- Idempotent — DB → env → hardcoded cascade; public (is_sensitive=false)

INSERT INTO system_configs (
  system, key, value, value_type, is_sensitive, is_required, allow_hardcoded, hardcoded_default, description
) VALUES
  (
    'registration',
    'VITE_ASSOCIATION_LOGO_PLACEMENTS',
    NULL,
    'string',
    false,
    false,
    true,
    '',
    'JSON: tipo e largura da logo por app (kunk/registration/docsign/admin) em login e menu'
  )
ON CONFLICT (system, key) DO NOTHING;
