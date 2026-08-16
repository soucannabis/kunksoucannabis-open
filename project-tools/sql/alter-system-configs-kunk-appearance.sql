-- system_configs: Kunk operational app appearance (system=kunk)
-- Idempotent — DB → env → hardcoded cascade; all public (is_sensitive=false)

INSERT INTO system_configs (
  system, key, value, value_type, is_sensitive, is_required, allow_hardcoded, hardcoded_default, description
) VALUES
  (
    'kunk',
    'VITE_KUNK_TITLE',
    NULL,
    'string',
    false,
    false,
    true,
    'Kunk SouCannabis',
    'Título exibido na sidebar do Kunk'
  ),
  (
    'kunk',
    'VITE_KUNK_LOGO',
    NULL,
    'string',
    false,
    false,
    true,
    '',
    'URL do logo (sidebar / login). Vazio = sem logo. Preferir /api/v1/files/{id}/download após upload.'
  ),
  (
    'kunk',
    'VITE_KUNK_BG_MODE',
    NULL,
    'string',
    false,
    false,
    true,
    'color',
    'Fundo do sistema: color ou image'
  ),
  (
    'kunk',
    'VITE_KUNK_BG_COLOR',
    NULL,
    'string',
    false,
    false,
    true,
    '#2a3b2b',
    'Cor de fundo quando bg_mode=color'
  ),
  (
    'kunk',
    'VITE_KUNK_BG_IMAGE',
    NULL,
    'string',
    false,
    false,
    true,
    '',
    'URL da imagem de fundo quando bg_mode=image'
  ),
  (
    'kunk',
    'VITE_KUNK_MENU_BG',
    NULL,
    'string',
    false,
    false,
    true,
    '#5a7a5b',
    'Cor de fundo do menu lateral'
  ),
  (
    'kunk',
    'VITE_KUNK_MENU_TEXT',
    NULL,
    'string',
    false,
    false,
    true,
    '#ffffff',
    'Cor da fonte do menu'
  ),
  (
    'kunk',
    'VITE_KUNK_MENU_HOVER_BG',
    NULL,
    'string',
    false,
    false,
    true,
    '#ffffff',
    'Cor de fundo no hover do menu'
  ),
  (
    'kunk',
    'VITE_KUNK_MENU_HOVER_TEXT',
    NULL,
    'string',
    false,
    false,
    true,
    '#2a3b2b',
    'Cor do texto/ícone no hover do menu'
  ),
  (
    'kunk',
    'VITE_KUNK_DEFAULT_THEME',
    NULL,
    'string',
    false,
    false,
    true,
    'dark',
    'Tema padrão se o usuário não tiver preferência: dark ou light'
  ),
  (
    'kunk',
    'VITE_KUNK_DARK_BG',
    NULL,
    'string',
    false,
    false,
    true,
    '#2a3b2b',
    'Fundo do tema escuro'
  ),
  (
    'kunk',
    'VITE_KUNK_DARK_PRIMARY',
    NULL,
    'string',
    false,
    false,
    true,
    '#5a7a5b',
    'Verde (primary) do tema escuro'
  ),
  (
    'kunk',
    'VITE_KUNK_DARK_ACCENT',
    NULL,
    'string',
    false,
    false,
    true,
    '#7A5B7A',
    'Roxo (accent) do tema escuro'
  ),
  (
    'kunk',
    'VITE_KUNK_DARK_ACCENT_HOVER',
    NULL,
    'string',
    false,
    false,
    true,
    '#684C68',
    'Hover do accent no tema escuro'
  ),
  (
    'kunk',
    'VITE_KUNK_LIGHT_BG',
    NULL,
    'string',
    false,
    false,
    true,
    '#f5f5f5',
    'Fundo do tema claro'
  ),
  (
    'kunk',
    'VITE_KUNK_LIGHT_PRIMARY',
    NULL,
    'string',
    false,
    false,
    true,
    '#5a7a5b',
    'Verde (primary) do tema claro'
  ),
  (
    'kunk',
    'VITE_KUNK_LIGHT_ACCENT',
    NULL,
    'string',
    false,
    false,
    true,
    '#7A5B7A',
    'Roxo (accent) do tema claro'
  ),
  (
    'kunk',
    'VITE_KUNK_LIGHT_ACCENT_HOVER',
    NULL,
    'string',
    false,
    false,
    true,
    '#684C68',
    'Hover do accent no tema claro'
  )
ON CONFLICT (system, key) DO NOTHING;
