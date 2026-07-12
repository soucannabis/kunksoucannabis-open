-- orders: freight carrier + option snapshot + dce for label declaration
-- Idempotent

ALTER TABLE orders ADD COLUMN IF NOT EXISTS freight_carrier VARCHAR(32);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS freight_option JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dce JSONB;
