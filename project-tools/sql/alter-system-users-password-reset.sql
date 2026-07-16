-- Password reset columns for system_users (operator forgot-password)
ALTER TABLE system_users
  ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);

ALTER TABLE system_users
  ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;
