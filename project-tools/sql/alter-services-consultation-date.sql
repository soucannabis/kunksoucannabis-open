-- services: date → consultation_date; remove fingerprint e commission_validation
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'date'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'consultation_date'
  ) THEN
    ALTER TABLE services RENAME COLUMN date TO consultation_date;
  END IF;
END $$;

ALTER TABLE services DROP COLUMN IF EXISTS fingerprint;
ALTER TABLE services DROP COLUMN IF EXISTS commission_validation;
