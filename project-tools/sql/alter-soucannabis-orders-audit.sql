-- Auditoria de movimentação SC ↔ OSS (outbound / webhook / sync).
-- Append-only. Idempotent.

CREATE TABLE IF NOT EXISTS soucannabis_orders_audit (
  id SERIAL PRIMARY KEY,
  date_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  direction VARCHAR(16) NOT NULL,
  source VARCHAR(32) NOT NULL,
  action VARCHAR(32) NOT NULL,
  http_method TEXT,
  http_path TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'ok',
  error_code TEXT,
  error_message TEXT,
  local_order_id INTEGER,
  order_code VARCHAR(64),
  soucannabis_order_id VARCHAR(64),
  user_code TEXT,
  correlation_id UUID,
  request_payload JSONB,
  response_payload JSONB,
  before_snapshot JSONB,
  after_snapshot JSONB,
  changed_keys JSONB,
  client_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_sc_orders_audit_date
  ON soucannabis_orders_audit (date_created DESC);

CREATE INDEX IF NOT EXISTS idx_sc_orders_audit_order_code
  ON soucannabis_orders_audit (order_code);

CREATE INDEX IF NOT EXISTS idx_sc_orders_audit_remote_id
  ON soucannabis_orders_audit (soucannabis_order_id);

CREATE INDEX IF NOT EXISTS idx_sc_orders_audit_local_id
  ON soucannabis_orders_audit (local_order_id);

CREATE INDEX IF NOT EXISTS idx_sc_orders_audit_dir_source
  ON soucannabis_orders_audit (direction, source);

CREATE INDEX IF NOT EXISTS idx_sc_orders_audit_correlation
  ON soucannabis_orders_audit (correlation_id);
