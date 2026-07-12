-- Nome do recebedor (etiqueta); independente de associate_name.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS receiver_name VARCHAR(255);

-- Backfill: pedidos sem recebedor usam o nome do associado.
UPDATE orders
SET receiver_name = associate_name
WHERE receiver_name IS NULL AND associate_name IS NOT NULL AND associate_name <> '';
