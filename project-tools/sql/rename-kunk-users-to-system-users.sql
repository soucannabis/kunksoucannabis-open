-- Renomeia kunk_users → system_users
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'kunk_users'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'system_users'
  ) THEN
    ALTER TABLE kunk_users RENAME TO system_users;
  END IF;
END $$;

-- Sequência associada (se existir com nome antigo)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'kunk_users_id_seq')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'system_users_id_seq') THEN
    ALTER SEQUENCE kunk_users_id_seq RENAME TO system_users_id_seq;
  END IF;
END $$;
