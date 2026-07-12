-- services.patient_user_code: beneficiário do atendimento (paciente do responsável)
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS patient_user_code UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_services_patient_user_code'
  ) THEN
    ALTER TABLE services
      ADD CONSTRAINT fk_services_patient_user_code
      FOREIGN KEY (patient_user_code) REFERENCES users(user_code) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_services_patient_user_code ON services (patient_user_code)
  WHERE patient_user_code IS NOT NULL;
