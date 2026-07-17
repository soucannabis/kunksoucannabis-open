-- Remove Pipefy / Beeviral / partner denormalized fields from schema alvo
-- Idempotent: IF EXISTS

ALTER TABLE users DROP COLUMN IF EXISTS pipefy_card_id;
ALTER TABLE users DROP COLUMN IF EXISTS partner_name;
ALTER TABLE users DROP COLUMN IF EXISTS pipefy_card_shop;
ALTER TABLE users DROP COLUMN IF EXISTS partner_code;
ALTER TABLE users DROP COLUMN IF EXISTS bvid;
ALTER TABLE users DROP COLUMN IF EXISTS bv_info;

ALTER TABLE orders DROP COLUMN IF EXISTS pipefy_card_shop;
ALTER TABLE orders DROP COLUMN IF EXISTS partner_name;
ALTER TABLE orders DROP COLUMN IF EXISTS partner_code;
ALTER TABLE orders DROP COLUMN IF EXISTS bvid;
ALTER TABLE orders DROP COLUMN IF EXISTS bvinfo;

ALTER TABLE professionals DROP COLUMN IF EXISTS bvid;

ALTER TABLE reception DROP COLUMN IF EXISTS bvid;

ALTER TABLE services DROP COLUMN IF EXISTS pipefy_card_id;
ALTER TABLE services DROP COLUMN IF EXISTS bvid;
