-- system_activity: audit log of operator actions (triage first)
-- Idempotent

CREATE TABLE IF NOT EXISTS system_activity (
  id SERIAL PRIMARY KEY,
  date_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_code TEXT,
  action TEXT NOT NULL,
  actor_user_code TEXT,
  actor_name TEXT,
  related_user_code TEXT,
  related_user_name TEXT,
  summary TEXT NOT NULL,
  metadata JSONB,
  read_by JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_system_activity_date_created
  ON system_activity (date_created DESC);

CREATE INDEX IF NOT EXISTS idx_system_activity_entity
  ON system_activity (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_system_activity_related
  ON system_activity (related_user_code, date_created DESC);

CREATE INDEX IF NOT EXISTS idx_system_activity_actor
  ON system_activity (actor_user_code, date_created DESC);
