-- reception: option1 → help_topic (“Como podemos ajudar?”); remove option2.
-- Idempotent.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reception' AND column_name = 'option1'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reception' AND column_name = 'help_topic'
  ) THEN
    ALTER TABLE reception RENAME COLUMN option1 TO help_topic;
  END IF;
END $$;

ALTER TABLE reception DROP COLUMN IF EXISTS option2;
ALTER TABLE reception DROP COLUMN IF EXISTS option1;

UPDATE system_configs
SET
  hardcoded_default = '[{"id":"name","enabled":true,"required":true,"label":"Nome","order":1},{"id":"last_name","enabled":true,"required":true,"label":"Sobrenome","order":2},{"id":"email","enabled":true,"required":true,"label":"E-mail","order":3},{"id":"phone","enabled":true,"required":true,"label":"Telefone","order":4},{"id":"help_topic","enabled":true,"required":false,"label":"Como podemos ajudar?","order":5,"type":"select","options":["Preciso de óleo / produto","Renovação de receita","Agendamento / consulta","Dúvidas sobre cadastro","Outro"]},{"id":"message","enabled":true,"required":false,"label":"Mensagem","order":6},{"id":"patient_name","enabled":false,"required":false,"label":"Nome do paciente","order":7}]',
  description = 'Campos do formulário público de triagem (help_topic = select com options)'
WHERE system = 'triage' AND key = 'triage.form.fields';

UPDATE system_configs
SET value = (
  SELECT COALESCE(jsonb_agg(
    CASE
      WHEN elem->>'id' = 'option1' THEN jsonb_set(elem, '{id}', '"help_topic"')
      ELSE elem
    END
    ORDER BY ord
  ) FILTER (WHERE elem->>'id' IS DISTINCT FROM 'option2'), '[]')::text
  FROM jsonb_array_elements(value::jsonb) WITH ORDINALITY AS t(elem, ord)
)
WHERE system = 'triage'
  AND key = 'triage.form.fields'
  AND value IS NOT NULL
  AND BTRIM(value) <> ''
  AND value ~ '^\s*\[';
