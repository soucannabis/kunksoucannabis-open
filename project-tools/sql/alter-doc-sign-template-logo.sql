-- Doc-sign: logo nos modelos + reset dos rascunhos padrão (termo sem/com paciente)
-- Idempotent

ALTER TABLE term_templates
  ADD COLUMN IF NOT EXISTS logo_file_id UUID REFERENCES files(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS term_templates_logo_file_id_idx
  ON term_templates (logo_file_id)
  WHERE logo_file_id IS NOT NULL;
