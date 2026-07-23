-- system_configs: backup settings under storage (idempotent)
INSERT INTO system_configs (
  system, key, value, value_type, is_sensitive, is_required, allow_hardcoded, hardcoded_default, description
) VALUES
  (
    'storage',
    'backup.enabled',
    NULL,
    'boolean',
    false,
    false,
    true,
    'false',
    'Se true, backups diários estão ativos (somente com bucket cloud locked)'
  ),
  (
    'storage',
    'backup.schedule_time',
    NULL,
    'string',
    false,
    false,
    true,
    '22:00',
    'Horário diário do backup (HH:MM) no fuso backup.timezone'
  ),
  (
    'storage',
    'backup.timezone',
    NULL,
    'string',
    false,
    false,
    true,
    'America/Sao_Paulo',
    'Fuso horário IANA do agendamento de backup'
  ),
  (
    'storage',
    'backup.retention_count',
    NULL,
    'number',
    false,
    false,
    true,
    '10',
    'Quantidade máxima de backups a reter no bucket'
  )
ON CONFLICT (system, key) DO NOTHING;
