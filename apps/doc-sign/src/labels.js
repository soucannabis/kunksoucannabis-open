/** Labels PT-BR para a UI. Slugs internos permanecem em inglês. */

export const STATUS_LABEL = {
  pending: 'Pendente',
  completed: 'Assinado',
  void: 'Anulado',
};

export const KIND_LABEL = {
  self: 'Associado',
  with_patient: 'Associado com paciente',
};

export const EVENT_LABEL = {
  'contract.created': 'Termo criado',
  'email.sent': 'E-mail enviado',
  'form.viewed': 'Formulário visualizado',
  'submission.started': 'Assinatura iniciada',
  'submission.completed': 'Assinatura concluída',
};

export const VARIABLE_LABEL = {
  responsible_full_name: 'Nome do responsável',
  patient_full_name: 'Nome do paciente',
  responsible_cpf: 'CPF do responsável',
  patient_cpf: 'CPF do paciente',
  responsible_rg: 'RG',
  associate_rg_issuer: 'Emissor do RG',
  nationality: 'Nacionalidade',
  marital_status: 'Estado civil',
  email: 'E-mail',
  street: 'Rua',
  street_number: 'Número',
  city: 'Cidade',
  neighborhood: 'Bairro',
  state: 'Estado',
  cep: 'CEP',
  current_date: 'Data atual',
  association_name: 'Nome da associação',
  association_full_name: 'Nome completo da associação',
  association_city: 'Cidade associação',
  association_state: 'Estado associação',
  association_cnpj: 'CNPJ associação',
  association_site: 'Site da associação',
  signature: 'Assinatura',
  user_code: 'Código do usuário',
};

export function statusLabel(status) {
  return STATUS_LABEL[status] || status || '—';
}

export function kindLabel(kind) {
  return KIND_LABEL[kind] || kind || '—';
}

export function eventLabel(type) {
  return EVENT_LABEL[type] || type || '—';
}

export function variableLabel(name) {
  return VARIABLE_LABEL[name] || name || '—';
}

export function formatValue(value) {
  if (value == null || String(value).trim() === '') return '—';
  return String(value);
}
