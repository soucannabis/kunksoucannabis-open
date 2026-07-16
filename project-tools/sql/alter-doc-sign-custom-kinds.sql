-- Doc-sign: allow custom template kinds beyond self / with_patient

ALTER TABLE term_templates DROP CONSTRAINT IF EXISTS term_templates_kind_check;
ALTER TABLE term_contracts DROP CONSTRAINT IF EXISTS term_contracts_kind_check;

ALTER TABLE term_templates
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS requires_patient BOOLEAN NOT NULL DEFAULT false;

UPDATE term_templates
SET display_name = CASE kind
  WHEN 'self' THEN 'Associado'
  WHEN 'with_patient' THEN 'Associado com paciente'
  ELSE COALESCE(display_name, title, kind)
END
WHERE display_name IS NULL OR display_name = '';

UPDATE term_templates SET requires_patient = true WHERE kind = 'with_patient';

ALTER TABLE term_templates
  ALTER COLUMN display_name SET DEFAULT '',
  ALTER COLUMN display_name SET NOT NULL;
