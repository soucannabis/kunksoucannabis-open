-- Remove campo opaco `at` (legado Directus) de todas as tabelas onde ainda exista.
-- Idempotent.

ALTER TABLE reception DROP COLUMN IF EXISTS at;
ALTER TABLE orders DROP COLUMN IF EXISTS at;
ALTER TABLE users DROP COLUMN IF EXISTS at;
ALTER TABLE services DROP COLUMN IF EXISTS at;
ALTER TABLE professionals DROP COLUMN IF EXISTS at;
