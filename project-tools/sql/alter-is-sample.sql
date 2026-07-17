-- Marca provenance de sample-data nas tabelas de negócio do seed.
-- Instalações já populadas só com sample: backfill is_sample = true em todas as linhas.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'files',
    'users',
    'system_users',
    'institutional_clients',
    'orders',
    'orders_files',
    'products',
    'professionals',
    'reception',
    'reports',
    'services',
    'services_files',
    'tags',
    'users_api',
    'users_files'
  ]
  LOOP
    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT false',
      t
    );
    EXECUTE format('UPDATE %I SET is_sample = true', t);
  END LOOP;
END $$;
