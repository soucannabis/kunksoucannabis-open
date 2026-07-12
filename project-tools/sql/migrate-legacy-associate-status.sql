-- Mapa legado → associate_status 1–5 (cutover)
-- Fonte: project-tools/docs/frontend/cadastramento/flow.md
-- Executar na cutover após backup. Ajuste filtros conforme dados reais.

-- Legenda legado (strings típicas) → fase nova:
--   email_created / welcome          → 1
--   associate_data / form_* / patient → 2
--   documents / docs_*               → 3
--   contract / signing / term        → 4
--   consultation / prescription / done-ish → 5
--   Associado (status)               → status='Associado', fase 5

BEGIN;

-- Exemplo idempotente: só atualiza quem ainda está fora do intervalo 1–5
-- ou com strings legadas em colunas auxiliares (se existirem).

UPDATE users
SET associate_status = 1
WHERE associate_status IS NULL
   OR associate_status = 0
   OR associate_status::text IN ('email_created', 'welcome');

UPDATE users
SET associate_status = 2
WHERE associate_status::text IN (
  'associate_data', 'form_error', 'form_ok', 'patient_data', '2'
) OR associate_status BETWEEN 6 AND 7;

UPDATE users
SET associate_status = 3
WHERE associate_status::text IN ('documents', 'docs', '3')
   OR associate_status = 8;

UPDATE users
SET associate_status = 4
WHERE associate_status::text IN ('contract', 'signing', 'term', '4');

UPDATE users
SET associate_status = 5
WHERE associate_status::text IN ('consultation', 'prescription', '5', '9')
   OR status = 'Associado';

-- Pacientes filhos não carregam o funil
UPDATE users
SET associate_status = NULL
WHERE status = 'patient';

-- Normaliza status final do responsável
UPDATE users
SET status = 'Associado'
WHERE status ILIKE 'associado'
  AND (status IS DISTINCT FROM 'Associado');

COMMIT;
