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
    'Nome curto da associação (ex.: SouCannabis)'
  ),
  (
    'registration',
    'VITE_ASSOCIATION_FULL_NAME',
    NULL,
    'string',
    false,
    false,
    true,
    '',
    'Nome completo / razão social da associação'
  ),
  (
    'registration',
    'VITE_ASSOCIATION_EMAIL',
    NULL,
    'string',
    false,
    false,
    true,
    '',
    'E-mail de contato da associação'
  ),
  (
    'registration',
    'VITE_ASSOCIATION_PHONE',
    NULL,
    'string',
    false,
    false,
    true,
    '',
    'Telefone de contato da associação'
  ),
  (
    'registration',
    'VITE_ASSOCIATION_SITE',
    NULL,
    'url',
    false,
    false,
    true,
    '',
    'Site da associação'
  ),
  (
    'registration',
    'VITE_ASSOCIATION_CNPJ',
    NULL,
    'string',
    false,
    false,
    true,
    '',
    'CNPJ da associação'
  ),
  (
    'registration',
    'VITE_ASSOCIATION_CITY',
    NULL,
    'string',
    false,
    false,
    true,
    '',
    'Cidade da associação'
  ),
  (
    'registration',
    'VITE_ASSOCIATION_STATE',
    NULL,
    'string',
    false,
    false,
    true,
    '',
    'UF (estado) da associação'
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
    'Ao continuar, você preencherá seus dados pessoais, enviará documentos de identidade e assinará o termo de adesão. Depois poderá anexar receitas, exames ou laudos e agendar uma consulta com a associação. O processo é simples e leva poucos minutos — tenha em mãos RG ou CNH e, se tiver, receitas e laudos médicos.',
    'Texto de boas-vindas do cadastramento'
  ),
  (
    'registration',
    'VITE_COMPLETION_TEXT',
    NULL,
    'string',
    false,
    false,
    true,
    'Obrigado por concluir seu cadastro. Abra uma solicitação de contato pelo botão abaixo. Em breve entraremos em contato com você.',
    'Texto da tela de cadastro concluído'
  ),
  (
    'registration',
    'VITE_SHOW_TRIAGE_BUTTON',
    NULL,
    'boolean',
    false,
    false,
    true,
    'true',
    'Exibir botão da triagem na tela de cadastro concluído'
  ),
  (
    'registration',
    'VITE_TRIAGE_FORM_URL',
    NULL,
    'string',
    false,
    false,
    true,
    '/contato',
    'URL de redirecionamento do formulário de contato/triagem'
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
