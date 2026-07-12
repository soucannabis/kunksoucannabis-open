-- system_configs: triage (form, statuses, modules)
-- Idempotent

INSERT INTO system_configs (
  system, key, value, value_type, is_sensitive, is_required, allow_hardcoded, hardcoded_default, description
) VALUES
  (
    'triage',
    'triage.form.fields',
    NULL,
    'json',
    false,
    false,
    true,
    '[{"id":"name","enabled":true,"required":true,"label":"Nome","order":1},{"id":"last_name","enabled":true,"required":true,"label":"Sobrenome","order":2},{"id":"email","enabled":true,"required":true,"label":"E-mail","order":3},{"id":"phone","enabled":true,"required":true,"label":"Telefone","order":4},{"id":"option1","enabled":true,"required":false,"label":"Como podemos ajudar?","order":5,"type":"select","options":["Preciso de óleo / produto","Renovação de receita","Agendamento / consulta","Dúvidas sobre cadastro","Outro"]},{"id":"option2","enabled":false,"required":false,"label":"Opção 2","order":6},{"id":"message","enabled":true,"required":false,"label":"Mensagem","order":7},{"id":"patient_name","enabled":false,"required":false,"label":"Nome do paciente","order":8}]',
    'Campos do formulário público de triagem (padrão)'
  ),
  (
    'triage',
    'triage.form.custom_fields',
    NULL,
    'json',
    false,
    false,
    true,
    '[]',
    'Campos personalizados do formulário público de triagem'
  ),
  (
    'triage',
    'triage.statuses',
    NULL,
    'json',
    false,
    false,
    true,
    '[{"id":"waiting","value":"waiting","label":"Espera","order":1,"is_default_entry":true,"is_terminal":false,"system":true,"icon":"AccessTimeFilled","color":"#7A5B7A"},{"id":"done","value":"done","label":"Concluído","order":99,"is_default_entry":false,"is_terminal":true,"system":true,"icon":"CheckCircle","color":"#2e7d32"}]',
    'Status da fila de triagem (sidebar e menu do avatar)'
  ),
  (
    'triage',
    'triage.module.associate_docs',
    NULL,
    'boolean',
    false,
    false,
    true,
    'false',
    'Módulo documentos/dados do associado na triagem (default off)'
  ),
  (
    'triage',
    'triage.public_form_enabled',
    NULL,
    'boolean',
    false,
    false,
    true,
    'true',
    'Formulário público de triagem habilitado'
  )
ON CONFLICT (system, key) DO NOTHING;

-- Keep seed defaults in sync when re-running (does not overwrite operator value)
UPDATE system_configs
SET hardcoded_default = '[{"id":"name","enabled":true,"required":true,"label":"Nome","order":1},{"id":"last_name","enabled":true,"required":true,"label":"Sobrenome","order":2},{"id":"email","enabled":true,"required":true,"label":"E-mail","order":3},{"id":"phone","enabled":true,"required":true,"label":"Telefone","order":4},{"id":"option1","enabled":true,"required":false,"label":"Como podemos ajudar?","order":5,"type":"select","options":["Preciso de óleo / produto","Renovação de receita","Agendamento / consulta","Dúvidas sobre cadastro","Outro"]},{"id":"option2","enabled":false,"required":false,"label":"Opção 2","order":6},{"id":"message","enabled":true,"required":false,"label":"Mensagem","order":7},{"id":"patient_name","enabled":false,"required":false,"label":"Nome do paciente","order":8}]',
    description = 'Campos do formulário público de triagem (option1 = select com options)'
WHERE system = 'triage' AND key = 'triage.form.fields';

UPDATE system_configs
SET hardcoded_default = '[{"id":"waiting","value":"waiting","label":"Espera","order":1,"is_default_entry":true,"is_terminal":false,"system":true,"icon":"AccessTimeFilled","color":"#7A5B7A"},{"id":"done","value":"done","label":"Concluído","order":99,"is_default_entry":false,"is_terminal":true,"system":true,"icon":"CheckCircle","color":"#2e7d32"}]',
    description = 'Status da fila de triagem (sidebar e menu do avatar; icon + color opcionais)'
WHERE system = 'triage' AND key = 'triage.statuses';
