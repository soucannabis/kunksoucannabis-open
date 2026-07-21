-- associate_status: INTEGER 1–5 → VARCHAR pt-BR
-- Fases: cadastro_criado | dados_pessoais | documentos | assinatura_termo | concluido
-- status=Associado passa a ser definido na assinatura do termo (não existe fase "consulta").
-- Idempotente: seguro reexecutar se a coluna já for VARCHAR.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'associate_status'
      AND data_type NOT IN ('character varying', 'text')
  ) THEN
    ALTER TABLE users
      ALTER COLUMN associate_status TYPE VARCHAR(64)
      USING (
        CASE
          WHEN associate_status IS NULL THEN NULL
          WHEN associate_status::text IN ('1', 'email_created', 'welcome', 'cadastro_criado')
            THEN 'cadastro_criado'
          WHEN associate_status::text IN (
            '2', 'associate_data', 'patient_data', 'form_error', 'dados_pessoais'
          ) THEN 'dados_pessoais'
          WHEN associate_status::text IN ('3', 'documents', 'docs', 'documentos')
            THEN 'documentos'
          WHEN associate_status::text IN (
            '4', 'contract', 'signing', 'term', 'assinatura_termo'
          ) THEN 'assinatura_termo'
          WHEN associate_status::text IN (
            '5', 'consultation', 'prescription', 'consulta'
          ) THEN '__legacy_5__'
          WHEN associate_status::text = 'concluido' THEN 'concluido'
          WHEN associate_status::text IN (
            'cadastro_criado', 'dados_pessoais', 'documentos', 'assinatura_termo'
          ) THEN associate_status::text
          ELSE 'cadastro_criado'
        END
      );
  END IF;
END $$;

-- Antiga fase 5 = pós-termo: vira Associado.
-- Se já era Associado, marca concluido; senão fica em assinatura_termo (pode usar /consulta).
UPDATE users
SET
  associate_status = CASE
    WHEN status = 'Associado' THEN 'concluido'
    ELSE 'assinatura_termo'
  END,
  status = CASE
    WHEN status = 'patient' THEN status
    ELSE 'Associado'
  END,
  date_updated = NOW()
WHERE associate_status = '__legacy_5__';

-- Quem tinha status errado 'cadastro_criado' (confusão com a fase): limpa status do funil.
UPDATE users
SET status = NULL,
    date_updated = NOW()
WHERE status = 'cadastro_criado';

-- Normaliza restos numéricos se a coluna já era VARCHAR.
UPDATE users
SET
  associate_status = CASE associate_status
    WHEN '1' THEN 'cadastro_criado'
    WHEN '2' THEN 'dados_pessoais'
    WHEN '3' THEN 'documentos'
    WHEN '4' THEN 'assinatura_termo'
    WHEN '5' THEN CASE WHEN status = 'Associado' THEN 'concluido' ELSE 'assinatura_termo' END
    ELSE associate_status
  END,
  date_updated = NOW()
WHERE associate_status IN ('1', '2', '3', '4', '5');
