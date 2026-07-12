-- system_configs: Google Calendar module flags (idempotent)
INSERT INTO system_configs (
  system, key, value, value_type, is_sensitive, is_required, allow_hardcoded, hardcoded_default, description
) VALUES
  (
    'modules',
    'modules.google_calendar.enabled',
    'false',
    'boolean',
    false,
    false,
    false,
    NULL,
    'Módulo Google Calendar habilitado (espelha MODULE_GOOGLE_CALENDAR_ENABLED)'
  ),
  (
    'modules',
    'modules.google_calendar.use_for_scheduling',
    'true',
    'boolean',
    false,
    false,
    false,
    NULL,
    'Usar Google Calendar no agendamento de serviços'
  ),
  (
    'modules',
    'modules.google_calendar.primary_calendar_id',
    NULL,
    'string',
    false,
    false,
    false,
    NULL,
    'Calendário principal da associação (não recebe eventos de consulta)'
  )
ON CONFLICT (system, key) DO NOTHING;
