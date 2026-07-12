-- system_configs: per-system runtime configuration (DB → env → hardcoded)
-- Idempotent

CREATE TABLE IF NOT EXISTS system_configs (
  id SERIAL PRIMARY KEY,
  system VARCHAR(64) NOT NULL,
  key VARCHAR(128) NOT NULL,
  value TEXT,
  value_type VARCHAR(32) NOT NULL DEFAULT 'string',
  is_sensitive BOOLEAN NOT NULL DEFAULT false,
  is_required BOOLEAN NOT NULL DEFAULT false,
  allow_hardcoded BOOLEAN NOT NULL DEFAULT true,
  hardcoded_default TEXT,
  description TEXT,
  date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_updated TIMESTAMP,
  UNIQUE (system, key)
);

-- Seed: registration branding (value NULL → cascade to local env / hardcoded)
INSERT INTO system_configs (
  system, key, value, value_type, is_sensitive, is_required, allow_hardcoded, hardcoded_default, description
) VALUES
  (
    'registration',
    'VITE_ASSOCIATION_NAME',
    NULL,
    'string',
    false,
    false,
    true,
    'Kunk',
    'Nome da associação exibido no cadastramento'
  ),
  (
    'registration',
    'VITE_ASSOCIATION_LOGO',
    NULL,
    'string',
    false,
    false,
    true,
    '/logo.svg',
    'Logo principal (login / welcome)'
  ),
  (
    'registration',
    'VITE_ASSOCIATION_LOGO_MENU',
    NULL,
    'string',
    false,
    false,
    true,
    '/logo.svg',
    'Logo do menu / navbar'
  ),
  (
    'registration',
    'VITE_ASSOCIATION_LOGO_SIZE',
    NULL,
    'string',
    false,
    false,
    true,
    '180px',
    'Tamanho CSS do logo principal'
  ),
  (
    'registration',
    'VITE_WELCOME_TEXT',
    NULL,
    'string',
    false,
    false,
    true,
    'Bem-vindo ao cadastro de associados.',
    'Texto de boas-vindas'
  ),
  (
    'registration',
    'VITE_CONTACT_URL',
    NULL,
    'url',
    false,
    false,
    true,
    '',
    'URL do CTA de contato (vazio oculta o botão)'
  )
ON CONFLICT (system, key) DO NOTHING;
