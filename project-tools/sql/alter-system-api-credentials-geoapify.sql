-- Geoapify credentials metadata (idempotent)
INSERT INTO system_api_credentials (
  service, field_key, encrypted_value, env_fallback, is_secret, description
) VALUES
  (
    'geoapify',
    'api_key',
    NULL,
    'GEOAPIFY_API_KEY',
    true,
    'Geoapify Geocoding API key'
  )
ON CONFLICT (service, field_key) DO NOTHING;
