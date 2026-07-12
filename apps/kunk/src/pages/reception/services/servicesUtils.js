/** Hash UUID → hex color (legado uuidToColor). */
export function uuidToColor(uuid) {
  const s = String(uuid || '0');
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 55%, 45%)`;
}

export function formatMoney(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDateTime(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString('pt-BR');
}

/** Fallback labels se o catálogo admin ainda não carregou. */
export const TYPE_LABELS = {
  medic: 'Médico',
  psychiatrist: 'Psiquiatra',
  psico: 'Psicólogo',
  therapist: 'Terapeuta',
  assist_social: 'Assistente Social',
  physiotherapist: 'Fisioterapeuta',
  dentist: 'Dentista',
  vet: 'Veterinário',
};

/** Aliases legados → id do catálogo admin (services.professional_types). */
export const LEGACY_TYPE_ALIASES = {
  physician: 'medic',
  medico: 'medic',
  médico: 'medic',
  doctor: 'medic',
  md: 'medic',
  psiquiatra: 'psychiatrist',
  psychiatry: 'psychiatrist',
  psicologo: 'psico',
  psicólogo: 'psico',
  psychologist: 'psico',
  psycho: 'psico',
  terapeuta: 'therapist',
  therapy: 'therapist',
  assistente_social: 'assist_social',
  'assistente social': 'assist_social',
  social_worker: 'assist_social',
  fisioterapeuta: 'physiotherapist',
  fisio: 'physiotherapist',
  physio: 'physiotherapist',
  dentista: 'dentist',
  odontologia: 'dentist',
  veterinario: 'vet',
  veterinário: 'vet',
  veterinary: 'vet',
};

export function normalizeProfessionalTypeId(typeId) {
  if (typeId == null || typeId === '') return null;
  const raw = String(typeId).trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  return LEGACY_TYPE_ALIASES[lower] || raw;
}

export function typeLabel(typeId, types = []) {
  const id = normalizeProfessionalTypeId(typeId) || typeId;
  const fromCatalog = (types || []).find((t) => t.id === id);
  if (fromCatalog?.label) return fromCatalog.label;
  return TYPE_LABELS[id] || id || '—';
}

/** Preço padrão do tipo no admin (null = não anula o do profissional). */
export function resolvePriceFromType(typeId, types = []) {
  const id = normalizeProfessionalTypeId(typeId) || typeId;
  const cfg = (types || []).find((t) => t.id === id);
  if (!cfg || cfg.default_consultation_price == null) return null;
  return Number(cfg.default_consultation_price);
}

/** Valor da consulta no create: preço padrão do tipo anula o do profissional. */
export function defaultPriceForType(typeId, professional, types = []) {
  const fromType = resolvePriceFromType(typeId || professional?.type, types);
  if (fromType != null) return fromType;
  if (professional?.consultation_price != null && professional.consultation_price !== '') {
    return Number(professional.consultation_price) || 0;
  }
  return 0;
}

export const PAYMENT_TYPES = [
  'Pix',
  'Boleto',
  'Cartão',
  'Crédito Associação',
  'Permuta',
  'Doação integral',
  'Serviço gratuito',
  'Mudas',
];

export const STATUS_AWAITING = 'Aguardando Pagamento';
export const STATUS_PAID = 'Pagamento Concluído';

/** Status legados do seed antigo → canônicos da UI. */
export function normalizeServiceStatus(status) {
  const s = String(status || '').trim();
  if (!s) return STATUS_AWAITING;
  const lower = s.toLowerCase();
  if (
    s === STATUS_PAID ||
    lower === 'pagamento concluído' ||
    lower === 'completed' ||
    lower === 'confirmed' ||
    lower === 'paid'
  ) {
    return STATUS_PAID;
  }
  if (
    s === STATUS_AWAITING ||
    lower === 'aguardando pagamento' ||
    lower === 'pending' ||
    lower === 'canceled' ||
    lower === 'cancelled'
  ) {
    return STATUS_AWAITING;
  }
  return s;
}

export function daysAgoIso(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Label de associado (users/search usa associate_name, não name). */
export function associateDisplayName(user) {
  if (!user || typeof user !== 'object') return '';
  const full =
    user.full_name ||
    user.fullname ||
    [user.associate_name, user.associate_last_name].filter(Boolean).join(' ').trim() ||
    [user.name, user.last_name].filter(Boolean).join(' ').trim();
  return full || '';
}

/** Tags podem vir como string ou { tag, ... }. */
export function formatTags(tags) {
  if (!Array.isArray(tags) || !tags.length) return '—';
  return tags
    .map((t) => {
      if (t == null) return '';
      if (typeof t === 'string') return t;
      if (typeof t === 'object') return t.tag || t.name || t.label || '';
      return String(t);
    })
    .filter(Boolean)
    .join(', ') || '—';
}
