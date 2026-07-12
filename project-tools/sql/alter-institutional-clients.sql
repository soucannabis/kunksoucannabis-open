-- Clientes institucionais (não associados) + vínculo em pedidos.

CREATE TABLE IF NOT EXISTS institutional_clients (
  id SERIAL PRIMARY KEY,
  client_code UUID UNIQUE NOT NULL,
  status VARCHAR(255) NOT NULL DEFAULT 'active',
  sort INTEGER,
  date_created TIMESTAMPTZ,
  date_updated TIMESTAMPTZ,
  annotations JSONB,
  is_company BOOLEAN NOT NULL DEFAULT false,
  company_name VARCHAR(255),
  company_trade_name VARCHAR(255),
  company_cnpj VARCHAR(255),
  company_email VARCHAR(255),
  company_phone VARCHAR(255),
  representative_name VARCHAR(255) NOT NULL,
  representative_last_name VARCHAR(255),
  representative_cpf VARCHAR(255) NOT NULL,
  representative_email VARCHAR(255),
  representative_mobile VARCHAR(255),
  street VARCHAR(255),
  street_number VARCHAR(255),
  complement VARCHAR(255),
  neighborhood VARCHAR(255),
  city VARCHAR(255),
  state VARCHAR(255),
  cep VARCHAR(255),
  delivery_address JSONB
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS institutional_client_id INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS institutional_client_code VARCHAR(255);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_institutional_client'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT fk_orders_institutional_client
      FOREIGN KEY (institutional_client_id) REFERENCES institutional_clients(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_institutional_client_id
  ON orders (institutional_client_id);

CREATE INDEX IF NOT EXISTS idx_institutional_clients_cnpj
  ON institutional_clients (company_cnpj);

CREATE INDEX IF NOT EXISTS idx_institutional_clients_cpf
  ON institutional_clients (representative_cpf);
