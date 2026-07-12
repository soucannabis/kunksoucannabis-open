-- Alinha professionals.type aos ids do catálogo admin (services.professional_types).
-- Idempotente: só reescreve aliases legados conhecidos.
-- Nota: a tabela professionals não tem date_updated.

UPDATE professionals
SET type = 'medic'
WHERE LOWER(TRIM(COALESCE(type, ''))) IN (
  'physician',
  'medico',
  'médico',
  'doctor',
  'md'
);

UPDATE professionals
SET type = 'psychiatrist'
WHERE LOWER(TRIM(COALESCE(type, ''))) IN (
  'psiquiatra',
  'psychiatry'
);

UPDATE professionals
SET type = 'psico'
WHERE LOWER(TRIM(COALESCE(type, ''))) IN (
  'psicologo',
  'psicólogo',
  'psychologist',
  'psycho'
);

UPDATE professionals
SET type = 'therapist'
WHERE LOWER(TRIM(COALESCE(type, ''))) IN (
  'terapeuta',
  'therapy'
);

UPDATE professionals
SET type = 'assist_social'
WHERE LOWER(TRIM(COALESCE(type, ''))) IN (
  'assistente_social',
  'assistente social',
  'social_worker'
);

UPDATE professionals
SET type = 'physiotherapist'
WHERE LOWER(TRIM(COALESCE(type, ''))) IN (
  'fisioterapeuta',
  'fisio',
  'physio'
);

UPDATE professionals
SET type = 'dentist'
WHERE LOWER(TRIM(COALESCE(type, ''))) IN (
  'dentista',
  'odontologia'
);

UPDATE professionals
SET type = 'vet'
WHERE LOWER(TRIM(COALESCE(type, ''))) IN (
  'veterinario',
  'veterinário',
  'veterinary'
);

-- Sem tipo: assume Médico (primeiro tipo padrão do catálogo)
UPDATE professionals
SET type = 'medic'
WHERE type IS NULL OR TRIM(COALESCE(type, '')) = '';
