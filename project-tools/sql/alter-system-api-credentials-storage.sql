-- Storage credentials metadata for S3 and GCS (idempotent)
INSERT INTO system_api_credentials (
  service, field_key, encrypted_value, env_fallback, is_secret, description
) VALUES
  (
    'storage_s3',
    'access_key_id',
    NULL,
    'S3_ACCESS_KEY_ID',
    true,
    'AWS Access Key ID (ou compatível S3)'
  ),
  (
    'storage_s3',
    'secret_access_key',
    NULL,
    'S3_SECRET_ACCESS_KEY',
    true,
    'AWS Secret Access Key'
  ),
  (
    'storage_gcs',
    'client_email',
    NULL,
    'GCS_CLIENT_EMAIL',
    true,
    'Service account client_email'
  ),
  (
    'storage_gcs',
    'private_key',
    NULL,
    'GCS_PRIVATE_KEY',
    true,
    'Service account private_key (PEM; \\n escapados)'
  ),
  (
    'storage_gcs',
    'credentials_json',
    NULL,
    'GCS_CREDENTIALS_JSON',
    true,
    'JSON completo da service account (alternativa a email+key)'
  )
ON CONFLICT (service, field_key) DO NOTHING;
