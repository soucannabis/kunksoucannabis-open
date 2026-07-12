-- Registration funnel: password reset + identity file metadata
-- Idempotent

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;

ALTER TABLE users_files ADD COLUMN IF NOT EXISTS doc_type VARCHAR(32);
ALTER TABLE users_files ADD COLUMN IF NOT EXISTS side VARCHAR(16);
ALTER TABLE users_files ADD COLUMN IF NOT EXISTS subject VARCHAR(32);
ALTER TABLE users_files ADD COLUMN IF NOT EXISTS doc_kind VARCHAR(32);
