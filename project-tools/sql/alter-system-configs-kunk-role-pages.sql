-- Páginas do Kunk permitidas por role (default: todas)
INSERT INTO system_configs (
  system, key, value, value_type, is_sensitive, is_required, allow_hardcoded, hardcoded_default, description
) VALUES
  (
    'kunk',
    'role_pages',
    '{"Administrador":["*"],"Acolhimento":["*"],"Produção":["*"],"Financeiro":["*"],"Profissional":["relatorios-servicos"]}',
    'json',
    false,
    false,
    false,
    NULL,
    'Páginas do menu Kunk por role (* = todas)'
  )
ON CONFLICT (system, key) DO NOTHING;
