-- Relações por código (UUID) + FKs para include/patients
-- Limpa valores inválidos antes de tipar / criar constraints.

-- users.responsible_code: limpar RESP-* e strings vazias
UPDATE users
SET responsible_code = NULL
WHERE responsible_code IS NULL
   OR TRIM(responsible_code::text) = ''
   OR responsible_code::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- services: limpar códigos inválidos
UPDATE services
SET professional_id = NULL
WHERE professional_id IS NULL
   OR TRIM(professional_id::text) = ''
   OR professional_id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

UPDATE services
SET associate_user_code = NULL
WHERE associate_user_code IS NULL
   OR TRIM(associate_user_code::text) = ''
   OR associate_user_code::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Tipagem UUID
ALTER TABLE users
  ALTER COLUMN responsible_code TYPE UUID USING (
    CASE
      WHEN responsible_code IS NULL OR TRIM(responsible_code::text) = '' THEN NULL
      ELSE responsible_code::uuid
    END
  );

ALTER TABLE services
  ALTER COLUMN professional_id TYPE UUID USING (
    CASE
      WHEN professional_id IS NULL OR TRIM(professional_id::text) = '' THEN NULL
      ELSE professional_id::uuid
    END
  );

ALTER TABLE services
  ALTER COLUMN associate_user_code TYPE UUID USING (
    CASE
      WHEN associate_user_code IS NULL OR TRIM(associate_user_code::text) = '' THEN NULL
      ELSE associate_user_code::uuid
    END
  );

-- UNIQUE em códigos
CREATE UNIQUE INDEX IF NOT EXISTS users_user_code_uidx ON users (user_code);
CREATE UNIQUE INDEX IF NOT EXISTS professionals_professional_code_uidx ON professionals (professional_code);

-- FKs (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_responsible_code') THEN
    ALTER TABLE users
      ADD CONSTRAINT fk_users_responsible_code
      FOREIGN KEY (responsible_code) REFERENCES users(user_code) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_services_professional_id') THEN
    ALTER TABLE services
      ADD CONSTRAINT fk_services_professional_id
      FOREIGN KEY (professional_id) REFERENCES professionals(professional_code) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_services_associate_user_code') THEN
    ALTER TABLE services
      ADD CONSTRAINT fk_services_associate_user_code
      FOREIGN KEY (associate_user_code) REFERENCES users(user_code) ON DELETE SET NULL;
  END IF;
END $$;
