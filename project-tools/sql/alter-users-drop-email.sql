-- Remove users.email; login/contact uses only email_account.
-- Idempotent. Safe to re-run.

-- Preserve contact when only the legacy column was populated.
UPDATE users
SET email_account = email
WHERE (email_account IS NULL OR btrim(email_account) = '')
  AND email IS NOT NULL
  AND btrim(email) <> '';

ALTER TABLE users DROP COLUMN IF EXISTS email;
