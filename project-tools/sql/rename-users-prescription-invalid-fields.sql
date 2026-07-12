-- Rename users columns for cadastramento OSS
-- medical_prescription → prescription
-- form_error_log → invalid_fields
-- Idempotent

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'medical_prescription'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'prescription'
  ) THEN
    ALTER TABLE users RENAME COLUMN medical_prescription TO prescription;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'form_error_log'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'invalid_fields'
  ) THEN
    ALTER TABLE users RENAME COLUMN form_error_log TO invalid_fields;
  END IF;
END $$;
