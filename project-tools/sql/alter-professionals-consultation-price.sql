-- professionals.consultation_price (valor padrão da consulta; ausente = 0)
ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS consultation_price NUMERIC(12, 2) DEFAULT 0;

UPDATE professionals
SET consultation_price = 0
WHERE consultation_price IS NULL;
