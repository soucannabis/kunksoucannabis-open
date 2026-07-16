-- orders: sync Pedidos SouCannabis + auditoria de pagamento
ALTER TABLE orders ADD COLUMN IF NOT EXISTS soucannabis_order_id VARCHAR(64);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS soucannabis_synced_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS soucannabis_sync_error TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS external_payment_info JSONB;

CREATE INDEX IF NOT EXISTS idx_orders_soucannabis_order_id
  ON orders (soucannabis_order_id)
  WHERE soucannabis_order_id IS NOT NULL;
