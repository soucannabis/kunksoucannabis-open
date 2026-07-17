-- web_vitals: Core Web Vitals / performance metrics from frontends
-- Idempotent

CREATE TABLE IF NOT EXISTS web_vitals (
  id BIGSERIAL PRIMARY KEY,
  date_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  rating TEXT,
  delta DOUBLE PRECISION,
  navigation_type TEXT,
  app TEXT,
  url TEXT,
  path TEXT,
  user_code TEXT,
  user_agent TEXT,
  connection_type TEXT,
  device_memory DOUBLE PRECISION,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_web_vitals_created
  ON web_vitals (date_created DESC);

CREATE INDEX IF NOT EXISTS idx_web_vitals_name_created
  ON web_vitals (name, date_created DESC);

CREATE INDEX IF NOT EXISTS idx_web_vitals_path_name
  ON web_vitals (path, name, date_created DESC);

CREATE INDEX IF NOT EXISTS idx_web_vitals_app
  ON web_vitals (app, date_created DESC);
