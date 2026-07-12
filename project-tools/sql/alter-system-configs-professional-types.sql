-- Tipos de profissional + settings do relatório de serviços (idempotent)
INSERT INTO system_configs (
  system, key, value, value_type, is_sensitive, is_required, allow_hardcoded, hardcoded_default, description
) VALUES
  (
    'services',
    'professional_types',
    '[
      {"id":"medic","label":"Médico","association_fee":0,"default_consultation_price":null,"active":true,"sort":10},
      {"id":"psychiatrist","label":"Psiquiatra","association_fee":0,"default_consultation_price":null,"active":true,"sort":20},
      {"id":"psico","label":"Psicólogo","association_fee":0,"default_consultation_price":null,"active":true,"sort":30},
      {"id":"therapist","label":"Terapeuta","association_fee":0,"default_consultation_price":null,"active":true,"sort":40},
      {"id":"assist_social","label":"Assistente Social","association_fee":0,"default_consultation_price":null,"active":true,"sort":50},
      {"id":"physiotherapist","label":"Fisioterapeuta","association_fee":0,"default_consultation_price":null,"active":true,"sort":60},
      {"id":"dentist","label":"Dentista","association_fee":0,"default_consultation_price":null,"active":true,"sort":70},
      {"id":"vet","label":"Veterinário","association_fee":0,"default_consultation_price":null,"active":true,"sort":80}
    ]',
    'json',
    false,
    false,
    false,
    NULL,
    'Catálogo de tipos de profissional: taxa associação + preço padrão de consulta'
  ),
  (
    'services',
    'report_settings',
    '{"deduct_donation_from_payable":false}',
    'json',
    false,
    false,
    false,
    '{"deduct_donation_from_payable":false}',
    'Relatório de serviços: se true, doação desconta do valor a pagar ao profissional'
  )
ON CONFLICT (system, key) DO NOTHING;

-- Incluir role Profissional em role_pages (merge se já existir)
UPDATE system_configs
SET value = (
  COALESCE(value::jsonb, '{}'::jsonb)
  || '{"Profissional":["relatorios-servicos"]}'::jsonb
)::text,
    date_updated = NOW()
WHERE system = 'kunk'
  AND key = 'role_pages'
  AND (value::jsonb -> 'Profissional') IS NULL;
