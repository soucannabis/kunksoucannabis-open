-- Google Calendar credentials metadata (idempotent)
INSERT INTO system_api_credentials (
  service, field_key, encrypted_value, env_fallback, is_secret, description
) VALUES
  (
    'google_calendar',
    'client_id',
    NULL,
    'GOOGLE_CLIENT_ID',
    true,
    'Google OAuth Client ID'
  ),
  (
    'google_calendar',
    'client_secret',
    NULL,
    'GOOGLE_CLIENT_SECRET',
    true,
    'Google OAuth Client Secret'
  ),
  (
    'google_calendar',
    'redirect_uri',
    NULL,
    'GOOGLE_REDIRECT_URI',
    false,
    'OAuth redirect URI (API callback)'
  ),
  (
    'google_calendar',
    'access_token',
    NULL,
    NULL,
    true,
    'Google OAuth access token (preenchido pelo callback)'
  ),
  (
    'google_calendar',
    'refresh_token',
    NULL,
    'GOOGLE_REFRESH_TOKEN',
    true,
    'Google OAuth refresh token'
  )
ON CONFLICT (service, field_key) DO NOTHING;
