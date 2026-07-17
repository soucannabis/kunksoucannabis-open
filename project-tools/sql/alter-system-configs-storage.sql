-- system_configs: storage driver / bucket metadata (idempotent)
INSERT INTO system_configs (
  system, key, value, value_type, is_sensitive, is_required, allow_hardcoded, hardcoded_default, description
) VALUES
  (
    'storage',
    'driver',
    NULL,
    'string',
    false,
    false,
    true,
    'local',
    'Driver ativo: local | s3 | gcs (ENV: FILES_DRIVER)'
  ),
  (
    'storage',
    'key_prefix',
    NULL,
    'string',
    false,
    false,
    true,
    'kunk/',
    'Prefixo das object keys no bucket (ENV: FILES_KEY_PREFIX)'
  ),
  (
    'storage',
    'locked',
    NULL,
    'boolean',
    false,
    false,
    true,
    'false',
    'Se true, impede trocar provedor/bucket após migração'
  ),
  (
    'storage',
    's3.bucket',
    NULL,
    'string',
    false,
    false,
    true,
    '',
    'Nome do bucket S3 (ENV: S3_BUCKET)'
  ),
  (
    'storage',
    's3.region',
    NULL,
    'string',
    false,
    false,
    true,
    'us-east-1',
    'Região S3 (ENV: S3_REGION)'
  ),
  (
    'storage',
    'gcs.bucket',
    NULL,
    'string',
    false,
    false,
    true,
    '',
    'Nome do bucket GCS (ENV: GCS_BUCKET)'
  ),
  (
    'storage',
    'gcs.project_id',
    NULL,
    'string',
    false,
    false,
    true,
    '',
    'GCP project id (ENV: GCS_PROJECT_ID)'
  )
ON CONFLICT (system, key) DO NOTHING;
