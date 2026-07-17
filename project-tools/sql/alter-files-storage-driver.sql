-- files: storage_driver + storage_key for local | s3 | gcs (idempotent)

ALTER TABLE files
  ADD COLUMN IF NOT EXISTS storage_driver VARCHAR(16) NOT NULL DEFAULT 'local';

ALTER TABLE files
  ADD COLUMN IF NOT EXISTS storage_key TEXT;

-- Backfill: local files keep path as key
UPDATE files
SET storage_driver = COALESCE(NULLIF(TRIM(storage_driver), ''), 'local'),
    storage_key = COALESCE(NULLIF(TRIM(storage_key), ''), storage_path)
WHERE storage_key IS NULL OR TRIM(storage_key) = '';
