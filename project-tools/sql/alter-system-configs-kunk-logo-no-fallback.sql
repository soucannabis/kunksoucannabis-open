-- Remove fallback estático /kunkLogo.png da aparência do Kunk.
-- Logo só via config (upload → /api/v1/files/:id/download) ou URL explícita.

UPDATE system_configs
SET
  hardcoded_default = '',
  description = 'URL do logo (sidebar / login). Vazio = sem logo. Preferir /api/v1/files/{id}/download após upload.',
  date_updated = NOW()
WHERE system = 'kunk'
  AND key = 'VITE_KUNK_LOGO';

-- Se o valor gravado ainda for o path estático antigo, limpa.
UPDATE system_configs
SET
  value = NULL,
  date_updated = NOW()
WHERE system = 'kunk'
  AND key = 'VITE_KUNK_LOGO'
  AND value IN ('/kunkLogo.png', 'kunkLogo.png');
