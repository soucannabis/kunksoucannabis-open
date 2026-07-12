-- Controle de estoque: trava de baixa no pedido + histórico de movimentos por produto.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS stock_debited_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS product_stock_movements (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  order_id INTEGER REFERENCES orders(id),
  quantity INTEGER NOT NULL,
  kind VARCHAR(32) NOT NULL,
  note TEXT,
  date_created TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_psm_product ON product_stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_psm_order ON product_stock_movements(order_id);
