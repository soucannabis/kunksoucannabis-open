-- services.commission_validation (aprovação/contestação no relatório de comissão)
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS commission_validation VARCHAR(32);

COMMENT ON COLUMN services.commission_validation IS
  'Relatório de serviços: null | approved | contested';
