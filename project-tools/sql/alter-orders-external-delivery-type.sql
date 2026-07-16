-- orders: tipo de entrega externa (loggi | melhorenvio) via app externa / SC
ALTER TABLE orders ADD COLUMN IF NOT EXISTS external_delivery_type VARCHAR(32);

COMMENT ON COLUMN orders.external_delivery_type IS
  'Transportadora externa para rastreio: loggi | melhorenvio (vindo da SC)';
