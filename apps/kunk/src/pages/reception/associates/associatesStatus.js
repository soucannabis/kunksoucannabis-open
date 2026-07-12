/** Mapa de status/fases OSS → labels da lista de associados */

/** Centraliza Dialogs na área de conteúdo (respeita menu lateral aberto/fechado). */
export const contentAreaDialogSx = {
  '& .MuiBackdrop-root': {
    left: 'var(--kunk-sidebar-offset, 220px)',
    width: 'calc(100% - var(--kunk-sidebar-offset, 220px))',
  },
  '& .MuiDialog-container': {
    marginLeft: 'var(--kunk-sidebar-offset, 220px)',
    width: 'calc(100% - var(--kunk-sidebar-offset, 220px))',
  },
};

export const FILTER_ALL = '';
export const FILTER_ASSOCIADO = 'Associado';
export const FILTER_PHASE_1 = 'phase_1';
export const FILTER_PHASE_2 = 'phase_2';
export const FILTER_PHASE_4 = 'phase_4';
export const FILTER_INVALID = 'invalid';

export const FILTER_OPTIONS = [
  { value: FILTER_ASSOCIADO, label: 'Associado' },
  { value: FILTER_PHASE_1, label: 'Não preencheu os dados' },
  { value: FILTER_PHASE_2, label: 'Apenas preencheu os dados' },
  { value: FILTER_PHASE_4, label: 'Termo não assinado' },
  { value: FILTER_INVALID, label: 'Erro no formulário' },
];

export function displayName(user) {
  if (!user) return '—';
  if (user.fullname) return String(user.fullname).trim();
  return [user.associate_name, user.associate_last_name].filter(Boolean).join(' ').trim() || '—';
}

export function statusLabel(user) {
  if (!user) return '—';
  if (String(user.status) === 'Associado') return 'Associado';
  if (String(user.status) === 'patient') return 'Paciente';

  const invalid = user.invalid_fields;
  if (invalid && String(invalid).trim() && String(invalid) !== '[]' && String(invalid) !== '{}') {
    return 'Erro no formulário';
  }

  const phase = Number(user.associate_status) || 0;
  if (phase <= 1 || String(user.status) === 'published') return 'Não preencheu os dados';
  if (phase === 2 || String(user.status) === 'registered') return 'Apenas preencheu os dados';
  if (phase === 3) return 'Documentos';
  if (phase === 4 || String(user.status) === 'proofs') return 'Termo não assinado';
  if (phase === 5) return 'Fase final';
  return String(user.status || '—');
}

export function matchesFilter(user, filter) {
  if (!filter) return true;
  const label = statusLabel(user);
  if (filter === FILTER_ASSOCIADO) return label === 'Associado';
  if (filter === FILTER_PHASE_1) return label === 'Não preencheu os dados';
  if (filter === FILTER_PHASE_2) return label === 'Apenas preencheu os dados';
  if (filter === FILTER_PHASE_4) return label === 'Termo não assinado';
  if (filter === FILTER_INVALID) return label === 'Erro no formulário';
  return true;
}

export function formatCreated(user) {
  const v = user?.created_date || user?.date_created;
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('pt-BR');
  } catch {
    return String(v);
  }
}

export function parseAnnotations(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
