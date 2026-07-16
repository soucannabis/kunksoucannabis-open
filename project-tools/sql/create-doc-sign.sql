-- Doc-sign: term templates, contracts, signatures, events
-- Idempotent

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS term_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  requires_patient BOOLEAN NOT NULL DEFAULT false,
  draft_content_json JSONB,
  logo_file_id UUID NULL REFERENCES files(id) ON DELETE SET NULL,
  current_version_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS term_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES term_templates(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  content_json JSONB NOT NULL,
  content_sha256 TEXT NOT NULL,
  pdf_file_id UUID NULL REFERENCES files(id) ON DELETE SET NULL,
  pdf_sha256 TEXT NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT NULL,
  UNIQUE (template_id, version_number)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_term_templates_current_version'
  ) THEN
    ALTER TABLE term_templates
      ADD CONSTRAINT fk_term_templates_current_version
      FOREIGN KEY (current_version_id) REFERENCES term_template_versions(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS term_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_code UUID NOT NULL REFERENCES users(user_code) ON DELETE CASCADE,
  signer_email TEXT NOT NULL,
  template_version_id UUID NOT NULL REFERENCES term_template_versions(id),
  kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'void')),
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  filled_pdf_file_id UUID NULL REFERENCES files(id) ON DELETE SET NULL,
  signed_pdf_file_id UUID NULL REFERENCES files(id) ON DELETE SET NULL,
  audit_pdf_file_id UUID NULL REFERENCES files(id) ON DELETE SET NULL,
  filled_pdf_sha256 TEXT NULL,
  signed_pdf_sha256 TEXT NULL,
  signing_token_hash TEXT NOT NULL,
  signing_token_expires TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS term_contracts_one_completed_user
  ON term_contracts (user_code) WHERE status = 'completed';

CREATE UNIQUE INDEX IF NOT EXISTS term_contracts_one_completed_email
  ON term_contracts (lower(signer_email)) WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS term_contracts_user_code_idx ON term_contracts (user_code);
CREATE INDEX IF NOT EXISTS term_contracts_status_idx ON term_contracts (status);
CREATE INDEX IF NOT EXISTS term_contracts_token_hash_idx ON term_contracts (signing_token_hash);

CREATE TABLE IF NOT EXISTS term_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES term_contracts(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('draw', 'type', 'upload')),
  typed_name TEXT NULL,
  image_file_id UUID NULL REFERENCES files(id) ON DELETE SET NULL,
  consent_accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS term_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES term_contracts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_email TEXT NULL,
  actor_name TEXT NULL,
  ip TEXT NULL,
  user_agent TEXT NULL,
  timezone TEXT NULL,
  meta JSONB NULL
);

CREATE INDEX IF NOT EXISTS term_events_contract_occurred_idx
  ON term_events (contract_id, occurred_at);

-- users.adhesion_term: TEXT → UUID (keep only valid UUID strings)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'adhesion_term'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE users
      ALTER COLUMN adhesion_term TYPE UUID
      USING CASE
        WHEN adhesion_term IS NULL OR btrim(adhesion_term) = '' THEN NULL
        WHEN adhesion_term ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN adhesion_term::uuid
        ELSE NULL
      END;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'adhesion_term'
  ) THEN
    ALTER TABLE users ADD COLUMN adhesion_term UUID;
  END IF;
END $$;

INSERT INTO term_templates (id, kind, title, display_name, requires_patient, draft_content_json)
VALUES
  (
    gen_random_uuid(),
    'self',
    'Termo de Adesão — responsável (sem paciente)',
    'Associado',
    false,
    jsonb_build_object(
      'type', 'doc',
      'content', jsonb_build_array(
        jsonb_build_object(
          'type', 'heading',
          'attrs', jsonb_build_object('level', 1),
          'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'Termo de Adesão'))
        ),
        jsonb_build_object(
          'type', 'paragraph',
          'content', jsonb_build_array(
            jsonb_build_object('type', 'text', 'text', 'Eu, '),
            jsonb_build_object('type', 'variable', 'attrs', jsonb_build_object('name', 'responsible_full_name')),
            jsonb_build_object('type', 'text', 'text', ', CPF '),
            jsonb_build_object('type', 'variable', 'attrs', jsonb_build_object('name', 'responsible_cpf')),
            jsonb_build_object('type', 'text', 'text', ', declaro adesão à associação.')
          )
        ),
        jsonb_build_object(
          'type', 'paragraph',
          'content', jsonb_build_array(
            jsonb_build_object('type', 'variable', 'attrs', jsonb_build_object('name', 'city')),
            jsonb_build_object('type', 'text', 'text', ', '),
            jsonb_build_object('type', 'variable', 'attrs', jsonb_build_object('name', 'current_date')),
            jsonb_build_object('type', 'text', 'text', '.')
          )
        ),
        jsonb_build_object(
          'type', 'paragraph',
          'content', jsonb_build_array(
            jsonb_build_object('type', 'text', 'text', 'Assinatura: '),
            jsonb_build_object('type', 'signature', 'attrs', jsonb_build_object('name', 'signature'))
          )
        )
      )
    )
  ),
  (
    gen_random_uuid(),
    'with_patient',
    'Termo de Adesão — responsável por paciente',
    'Associado com paciente',
    true,
    jsonb_build_object(
      'type', 'doc',
      'content', jsonb_build_array(
        jsonb_build_object(
          'type', 'heading',
          'attrs', jsonb_build_object('level', 1),
          'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'Termo de Adesão'))
        ),
        jsonb_build_object(
          'type', 'paragraph',
          'content', jsonb_build_array(
            jsonb_build_object('type', 'text', 'text', 'Eu, '),
            jsonb_build_object('type', 'variable', 'attrs', jsonb_build_object('name', 'responsible_full_name')),
            jsonb_build_object('type', 'text', 'text', ', CPF '),
            jsonb_build_object('type', 'variable', 'attrs', jsonb_build_object('name', 'responsible_cpf')),
            jsonb_build_object(
              'type', 'text',
              'text',
              ', responsável pelo tratamento de '
            ),
            jsonb_build_object('type', 'variable', 'attrs', jsonb_build_object('name', 'patient_full_name')),
            jsonb_build_object('type', 'text', 'text', ' CPF '),
            jsonb_build_object('type', 'variable', 'attrs', jsonb_build_object('name', 'patient_cpf')),
            jsonb_build_object('type', 'text', 'text', ', declaro adesão à associação.')
          )
        ),
        jsonb_build_object(
          'type', 'paragraph',
          'content', jsonb_build_array(
            jsonb_build_object('type', 'variable', 'attrs', jsonb_build_object('name', 'city')),
            jsonb_build_object('type', 'text', 'text', ', '),
            jsonb_build_object('type', 'variable', 'attrs', jsonb_build_object('name', 'current_date')),
            jsonb_build_object('type', 'text', 'text', '.')
          )
        ),
        jsonb_build_object(
          'type', 'paragraph',
          'content', jsonb_build_array(
            jsonb_build_object('type', 'text', 'text', 'Assinatura: '),
            jsonb_build_object('type', 'signature', 'attrs', jsonb_build_object('name', 'signature'))
          )
        )
      )
    )
  )
ON CONFLICT (kind) DO NOTHING;
