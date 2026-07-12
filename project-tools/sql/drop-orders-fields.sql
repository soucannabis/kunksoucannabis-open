-- Remove campos de orders: Melhor Envio, comissão, DCE, lote do pedido e delivery_problem
ALTER TABLE orders DROP COLUMN IF EXISTS melhorenvio_order_id;
ALTER TABLE orders DROP COLUMN IF EXISTS commission_validation;
ALTER TABLE orders DROP COLUMN IF EXISTS delivery_problem;
ALTER TABLE orders DROP COLUMN IF EXISTS no_commission;
ALTER TABLE orders DROP COLUMN IF EXISTS dce;
ALTER TABLE orders DROP COLUMN IF EXISTS batch;
