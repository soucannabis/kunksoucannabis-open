-- system_errors: native error observability events
-- system_error_resolutions: per-hash triage status
-- Idempotent

CREATE TABLE IF NOT EXISTS system_errors (
  id BIGSERIAL PRIMARY KEY,
  date_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_hash CHAR(64) NOT NULL,
  source TEXT NOT NULL,
  app TEXT,
  severity TEXT NOT NULL DEFAULT 'error',
  message TEXT NOT NULL,
  code TEXT,
  file_name TEXT,
  lineno INT,
  colno INT,
  stack_trace TEXT,
  url TEXT,
  method TEXT,
  status_code INT,
  user_code TEXT,
  user_agent TEXT,
  request_id TEXT,
  environment TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_system_errors_hash_created
  ON system_errors (error_hash, date_created DESC);

CREATE INDEX IF NOT EXISTS idx_system_errors_created
  ON system_errors (date_created DESC);

CREATE INDEX IF NOT EXISTS idx_system_errors_source
  ON system_errors (source, date_created DESC);

CREATE TABLE IF NOT EXISTS system_error_resolutions (
  error_hash CHAR(64) PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  note TEXT
);
