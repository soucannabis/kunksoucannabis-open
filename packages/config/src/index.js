/** Public Vite env helpers for association branding (no secrets). */

/** Env keys that stay on Vite/build only — never loaded from system_configs. */
export const BOOTSTRAP_ENV_KEYS = ['VITE_API_URL', 'VITE_URL'];

/** Branding keys resolved via API (DB → env → hardcoded) for system=registration. */
export const BRANDING_ENV_KEYS = [
  'VITE_ASSOCIATION_NAME',
  'VITE_ASSOCIATION_LOGO',
  'VITE_ASSOCIATION_LOGO_MENU',
  'VITE_ASSOCIATION_LOGO_SIZE',
  'VITE_WELCOME_TEXT',
  'VITE_CONTACT_URL',
];

/** Appearance keys resolved via API for system=kunk (operational app). */
export const KUNK_BRANDING_ENV_KEYS = [
  'VITE_KUNK_TITLE',
  'VITE_KUNK_LOGO',
  'VITE_KUNK_BG_MODE',
  'VITE_KUNK_BG_COLOR',
  'VITE_KUNK_BG_IMAGE',
  'VITE_KUNK_MENU_BG',
  'VITE_KUNK_MENU_TEXT',
  'VITE_KUNK_MENU_HOVER_BG',
  'VITE_KUNK_MENU_HOVER_TEXT',
  'VITE_KUNK_DEFAULT_THEME',
  'VITE_KUNK_DARK_BG',
  'VITE_KUNK_DARK_PRIMARY',
  'VITE_KUNK_DARK_ACCENT',
  'VITE_KUNK_DARK_ACCENT_HOVER',
  'VITE_KUNK_LIGHT_BG',
  'VITE_KUNK_LIGHT_PRIMARY',
  'VITE_KUNK_LIGHT_ACCENT',
  'VITE_KUNK_LIGHT_ACCENT_HOVER',
];

export const PUBLIC_ENV_KEYS = [...BOOTSTRAP_ENV_KEYS, ...BRANDING_ENV_KEYS];

const ENV_TO_CONFIG = {
  VITE_ASSOCIATION_NAME: 'associationName',
  VITE_ASSOCIATION_LOGO: 'associationLogo',
  VITE_ASSOCIATION_LOGO_MENU: 'associationLogoMenu',
  VITE_ASSOCIATION_LOGO_SIZE: 'associationLogoSize',
  VITE_WELCOME_TEXT: 'welcomeText',
  VITE_CONTACT_URL: 'contactUrl',
};

const ENV_TO_KUNK_CONFIG = {
  VITE_KUNK_TITLE: 'title',
  VITE_KUNK_LOGO: 'logo',
  VITE_KUNK_BG_MODE: 'bgMode',
  VITE_KUNK_BG_COLOR: 'bgColor',
  VITE_KUNK_BG_IMAGE: 'bgImage',
  VITE_KUNK_MENU_BG: 'menuBg',
  VITE_KUNK_MENU_TEXT: 'menuText',
  VITE_KUNK_MENU_HOVER_BG: 'menuHoverBg',
  VITE_KUNK_MENU_HOVER_TEXT: 'menuHoverText',
  VITE_KUNK_DEFAULT_THEME: 'defaultTheme',
  VITE_KUNK_DARK_BG: 'darkBg',
  VITE_KUNK_DARK_PRIMARY: 'darkPrimary',
  VITE_KUNK_DARK_ACCENT: 'darkAccent',
  VITE_KUNK_DARK_ACCENT_HOVER: 'darkAccentHover',
  VITE_KUNK_LIGHT_BG: 'lightBg',
  VITE_KUNK_LIGHT_PRIMARY: 'lightPrimary',
  VITE_KUNK_LIGHT_ACCENT: 'lightAccent',
  VITE_KUNK_LIGHT_ACCENT_HOVER: 'lightAccentHover',
};

/** Fixed logo frame in the Kunk sidebar (CSS px). Crop export uses LOGO_EXPORT_SIZE. */
export const KUNK_LOGO_FRAME_SIZE = 120;
export const KUNK_LOGO_EXPORT_SIZE = 512;

/** Hardcoded defaults for Kunk appearance (mirrors SQL seed). */
export const KUNK_APPEARANCE_DEFAULTS = {
  title: 'Kunk SouCannabis',
  logo: '',
  bgMode: 'color',
  bgColor: '#2a3b2b',
  bgImage: '',
  menuBg: '#5a7a5b',
  menuText: '#ffffff',
  menuHoverBg: '#ffffff',
  menuHoverText: '#000000',
  defaultTheme: 'dark',
  darkBg: '#2a3b2b',
  darkPrimary: '#5a7a5b',
  darkAccent: '#7A5B7A',
  darkAccentHover: '#684C68',
  lightBg: '#f5f5f5',
  lightPrimary: '#5a7a5b',
  lightAccent: '#7A5B7A',
  lightAccentHover: '#684C68',
};

/** Map camelCase config prop → env key (for admin save). */
export const KUNK_CONFIG_TO_ENV = Object.fromEntries(
  Object.entries(ENV_TO_KUNK_CONFIG).map(([envKey, prop]) => [prop, envKey]),
);

/** Default options for “Como podemos ajudar?” (help_topic select). */
export const TRIAGE_DEFAULT_HELP_TOPIC_OPTIONS = [
  'Preciso de óleo / produto',
  'Renovação de receita',
  'Agendamento / consulta',
  'Dúvidas sobre cadastro',
  'Outro',
];

/** Defaults for triage (system=triage). */
export const TRIAGE_DEFAULT_FORM_FIELDS = [
  { id: 'name', enabled: true, required: true, label: 'Nome', order: 1 },
  { id: 'last_name', enabled: true, required: true, label: 'Sobrenome', order: 2 },
  { id: 'email', enabled: true, required: true, label: 'E-mail', order: 3 },
  { id: 'phone', enabled: true, required: true, label: 'Telefone', order: 4 },
  {
    id: 'help_topic',
    enabled: true,
    required: true,
    label: 'Como podemos ajudar?',
    order: 5,
    type: 'select',
    options: [...TRIAGE_DEFAULT_HELP_TOPIC_OPTIONS],
  },
  { id: 'message', enabled: true, required: true, label: 'Mensagem', order: 6 },
  { id: 'patient_name', enabled: false, required: true, label: 'Nome do paciente', order: 7 },
];

/** Ensure help_topic is a select; drop removed form fields (e.g. is_associate, option2). */
export function normalizeTriageFormFields(fields) {
  const list = Array.isArray(fields) ? fields : [];
  return list
    .filter((f) => f && f.id !== 'is_associate' && f.id !== 'option2')
    .map((f) => {
      const field = f.id === 'option1' ? { ...f, id: 'help_topic' } : { ...f };
      if (field.id !== 'help_topic') return field;
      const options = Array.isArray(field.options) && field.options.length
        ? field.options.map((o) => String(o).trim()).filter(Boolean)
        : [...TRIAGE_DEFAULT_HELP_TOPIC_OPTIONS];
      return {
        ...field,
        type: 'select',
        options,
      };
    });
}

/** Curated MUI icon names for triage status (id = @mui/icons-material export). */
export const TRIAGE_STATUS_ICON_OPTIONS = [
  { id: 'AccessTimeFilled', label: 'Relógio preenchido', material: 'access_time_filled' },
  { id: 'AccessTime', label: 'Relógio', material: 'access_time' },
  { id: 'Schedule', label: 'Agenda', material: 'schedule' },
  { id: 'HourglassEmpty', label: 'Ampulheta', material: 'hourglass_empty' },
  { id: 'Pending', label: 'Pendente', material: 'pending' },
  { id: 'PlayCircle', label: 'Em andamento', material: 'play_circle' },
  { id: 'PauseCircle', label: 'Pausado', material: 'pause_circle' },
  { id: 'CheckCircle', label: 'Concluído', material: 'check_circle' },
  { id: 'TaskAlt', label: 'Tarefa ok', material: 'task_alt' },
  { id: 'DoneAll', label: 'Tudo feito', material: 'done_all' },
  { id: 'Cancel', label: 'Cancelado', material: 'cancel' },
  { id: 'Warning', label: 'Atenção', material: 'warning' },
  { id: 'PriorityHigh', label: 'Prioridade', material: 'priority_high' },
  { id: 'Flag', label: 'Bandeira', material: 'flag' },
  { id: 'Star', label: 'Estrela', material: 'star' },
  { id: 'Person', label: 'Pessoa', material: 'person' },
  { id: 'SupportAgent', label: 'Atendente', material: 'support_agent' },
  { id: 'Chat', label: 'Chat', material: 'chat' },
  { id: 'Mail', label: 'E-mail', material: 'mail' },
  { id: 'Phone', label: 'Telefone', material: 'phone' },
  { id: 'Inbox', label: 'Caixa de entrada', material: 'inbox' },
  { id: 'Sync', label: 'Sincronizar', material: 'sync' },
];

export const TRIAGE_DEFAULT_STATUS_ICON = 'AccessTime';
export const TRIAGE_DEFAULT_STATUS_COLOR = '#5c6bc0';

export const TRIAGE_DEFAULT_STATUSES = [
  {
    id: 'waiting',
    value: 'waiting',
    label: 'Espera',
    order: 1,
    is_default_entry: true,
    is_terminal: false,
    system: true,
    icon: 'AccessTimeFilled',
    color: '#7A5B7A',
  },
  {
    id: 'done',
    value: 'done',
    label: 'Concluído',
    order: 99,
    is_default_entry: false,
    is_terminal: true,
    system: true,
    icon: 'CheckCircle',
    color: '#2e7d32',
  },
];

const TRIAGE_STATUS_ICON_IDS = new Set(TRIAGE_STATUS_ICON_OPTIONS.map((o) => o.id));

/** Fill missing icon/color on a status (legacy configs). */
export function normalizeTriageStatus(status) {
  if (!status || typeof status !== 'object') return status;
  const next = { ...status };
  const iconOk = next.icon && TRIAGE_STATUS_ICON_IDS.has(String(next.icon));
  if (!iconOk) {
    if (next.is_default_entry) next.icon = 'AccessTimeFilled';
    else if (next.is_terminal) next.icon = 'CheckCircle';
    else next.icon = TRIAGE_DEFAULT_STATUS_ICON;
  }
  const color = String(next.color || '').trim();
  if (!/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(color)) {
    if (next.is_default_entry) next.color = '#7A5B7A';
    else if (next.is_terminal) next.color = '#2e7d32';
    else next.color = TRIAGE_DEFAULT_STATUS_COLOR;
  } else {
    next.color = color;
  }
  return next;
}

export function normalizeTriageStatuses(statuses) {
  return (Array.isArray(statuses) ? statuses : []).map(normalizeTriageStatus);
}

export const TRIAGE_CONFIG_KEYS = {
  formFields: 'triage.form.fields',
  customFields: 'triage.form.custom_fields',
  statuses: 'triage.statuses',
  associateDocs: 'triage.module.associate_docs',
  publicFormEnabled: 'triage.public_form_enabled',
};

export function parseJsonConfig(raw, fallback) {
  if (raw == null || raw === '') return fallback;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return fallback;
  }
}

export function parseBoolConfig(raw, fallback = false) {
  if (raw === undefined || raw === null || raw === '') return fallback;
  if (typeof raw === 'boolean') return raw;
  const s = String(raw).toLowerCase().trim();
  if (s === 'true' || s === '1' || s === 'yes') return true;
  if (s === 'false' || s === '0' || s === 'no') return false;
  return fallback;
}

export function getTriageDefaults() {
  return {
    formFields: TRIAGE_DEFAULT_FORM_FIELDS.map((f) => ({
      ...f,
      options: Array.isArray(f.options) ? [...f.options] : f.options,
    })),
    customFields: [],
    statuses: TRIAGE_DEFAULT_STATUSES.map((s) => ({ ...s })),
    associateDocs: false,
    publicFormEnabled: true,
  };
}

/**
 * Merge triage public/admin resolved values into defaults.
 * @param {Record<string, string>|null|undefined} apiValues key → raw string
 */
export function mergeTriageConfigFromApi(apiValues) {
  const defaults = getTriageDefaults();
  if (!apiValues || typeof apiValues !== 'object') return defaults;
  const keys = TRIAGE_CONFIG_KEYS;
  return {
    formFields: normalizeTriageFormFields(
      parseJsonConfig(apiValues[keys.formFields], defaults.formFields),
    ),
    customFields: parseJsonConfig(apiValues[keys.customFields], defaults.customFields),
    statuses: normalizeTriageStatuses(
      parseJsonConfig(apiValues[keys.statuses], defaults.statuses),
    ),
    associateDocs: parseBoolConfig(apiValues[keys.associateDocs], defaults.associateDocs),
    publicFormEnabled: parseBoolConfig(
      apiValues[keys.publicFormEnabled],
      defaults.publicFormEnabled,
    ),
  };
}

export function getEnabledFormFields(triageConfig) {
  const cfg = triageConfig || getTriageDefaults();
  const standard = (cfg.formFields || [])
    .filter((f) => f && f.enabled !== false)
    .map((f) => ({ ...f, source: 'standard' }));
  const custom = (cfg.customFields || [])
    .filter((f) => f && f.enabled !== false)
    .map((f) => ({ ...f, source: 'custom' }));
  return [...standard, ...custom].sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function getEntryStatusValue(statuses = TRIAGE_DEFAULT_STATUSES) {
  const entry = (statuses || []).find((s) => s.is_default_entry);
  return entry?.value || 'waiting';
}

export function getTerminalStatusValue(statuses = TRIAGE_DEFAULT_STATUSES) {
  const terminal = (statuses || []).find((s) => s.is_terminal);
  return terminal?.value || 'done';
}

/** Default order statuses (payment toggle + SC approval). Extra statuses via admin. */
export const ORDER_DEFAULT_STATUSES = [
  {
    id: 'awaiting_payment',
    value: 'Aguardando pagamento',
    label: 'Aguardando pagamento',
    order: 1,
    system: true,
    is_awaiting: true,
    color: '#c9a227',
  },
  {
    id: 'payment_done',
    value: 'Pagamento concluído',
    label: 'Pagamento concluído',
    order: 2,
    system: true,
    is_paid: true,
    color: '#2e7d32',
  },
  {
    id: 'awaiting_approval',
    value: 'Aguardando aprovação',
    label: 'Aguardando aprovação',
    order: 3,
    system: true,
    is_awaiting_approval: true,
    color: '#1565c0',
  },
];

export const ORDER_STATUS_AWAITING = 'Aguardando pagamento';
export const ORDER_STATUS_PAID = 'Pagamento concluído';
export const ORDER_STATUS_AWAITING_APPROVAL = 'Aguardando aprovação';

export const STORE_ORDER_STATUS_KEY = 'store.order_statuses';

export function normalizeOrderStatuses(statuses) {
  const list = Array.isArray(statuses) ? statuses : [];
  if (!list.length) return ORDER_DEFAULT_STATUSES.map((s) => ({ ...s }));
  return list
    .filter((s) => s && s.value)
    .map((s, i) => ({
      id: s.id || `st_${i}`,
      value: String(s.value),
      label: String(s.label || s.value),
      order: Number(s.order) || i + 1,
      system: Boolean(s.system),
      is_awaiting: Boolean(s.is_awaiting),
      is_paid: Boolean(s.is_paid),
      is_awaiting_approval: Boolean(s.is_awaiting_approval),
      color: s.color || '#5c6bc0',
    }))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function getOrderStatusDefaults() {
  return { statuses: ORDER_DEFAULT_STATUSES.map((s) => ({ ...s })) };
}

export function mergeOrderStatusesFromApi(raw) {
  const parsed = parseJsonConfig(raw, ORDER_DEFAULT_STATUSES);
  return normalizeOrderStatuses(parsed);
}

export function getAwaitingPaymentValue(statuses = ORDER_DEFAULT_STATUSES) {
  const row = (statuses || []).find((s) => s.is_awaiting);
  return row?.value || ORDER_STATUS_AWAITING;
}

export function getPaidStatusValue(statuses = ORDER_DEFAULT_STATUSES) {
  const row = (statuses || []).find((s) => s.is_paid);
  return row?.value || ORDER_STATUS_PAID;
}

export function getAwaitingApprovalValue(statuses = ORDER_DEFAULT_STATUSES) {
  const row = (statuses || []).find((s) => s.is_awaiting_approval);
  return row?.value || ORDER_STATUS_AWAITING_APPROVAL;
}

export function isAllowedOrderStatus(status, statuses = ORDER_DEFAULT_STATUSES) {
  const v = String(status || '');
  return (statuses || []).some((s) => String(s.value) === v);
}

export function getPublicConfig(env = import.meta.env) {
  return {
    apiUrl: env.VITE_API_URL || '/api/v1',
    appUrl: env.VITE_URL || 'http://localhost:4255',
    associationName: env.VITE_ASSOCIATION_NAME || 'Kunk',
    associationLogo: env.VITE_ASSOCIATION_LOGO || '/logo.svg',
    associationLogoMenu: env.VITE_ASSOCIATION_LOGO_MENU || env.VITE_ASSOCIATION_LOGO || '/logo.svg',
    associationLogoSize: env.VITE_ASSOCIATION_LOGO_SIZE || '180px',
    welcomeText: env.VITE_WELCOME_TEXT || 'Bem-vindo ao cadastro de associados.',
    contactUrl: env.VITE_CONTACT_URL || '',
  };
}

/**
 * Bootstrap + hardcoded defaults for Kunk operational appearance.
 * @param {ImportMetaEnv|Record<string, string|undefined>} [env]
 */
export function getKunkPublicConfig(env = import.meta.env) {
  const d = KUNK_APPEARANCE_DEFAULTS;
  return {
    apiUrl: env.VITE_API_URL || '/api/v1',
    appUrl: env.VITE_URL || 'http://localhost:4257',
    title: env.VITE_KUNK_TITLE || d.title,
    logo: env.VITE_KUNK_LOGO || d.logo,
    bgMode: env.VITE_KUNK_BG_MODE || d.bgMode,
    bgColor: env.VITE_KUNK_BG_COLOR || d.bgColor,
    bgImage: env.VITE_KUNK_BG_IMAGE || d.bgImage,
    menuBg: env.VITE_KUNK_MENU_BG || d.menuBg,
    menuText: env.VITE_KUNK_MENU_TEXT || d.menuText,
    menuHoverBg: env.VITE_KUNK_MENU_HOVER_BG || d.menuHoverBg,
    menuHoverText: env.VITE_KUNK_MENU_HOVER_TEXT || d.menuHoverText,
    defaultTheme: env.VITE_KUNK_DEFAULT_THEME || d.defaultTheme,
    darkBg: env.VITE_KUNK_DARK_BG || d.darkBg,
    darkPrimary: env.VITE_KUNK_DARK_PRIMARY || d.darkPrimary,
    darkAccent: env.VITE_KUNK_DARK_ACCENT || d.darkAccent,
    darkAccentHover: env.VITE_KUNK_DARK_ACCENT_HOVER || d.darkAccentHover,
    lightBg: env.VITE_KUNK_LIGHT_BG || d.lightBg,
    lightPrimary: env.VITE_KUNK_LIGHT_PRIMARY || d.lightPrimary,
    lightAccent: env.VITE_KUNK_LIGHT_ACCENT || d.lightAccent,
    lightAccentHover: env.VITE_KUNK_LIGHT_ACCENT_HOVER || d.lightAccentHover,
  };
}

/**
 * Merge resolved public config values from GET /config/public into a base config.
 * Only branding keys are applied; apiUrl/appUrl stay from Vite bootstrap.
 * @param {ReturnType<typeof getPublicConfig>} base
 * @param {Record<string, string>|null|undefined} apiValues map of env key → value
 */
export function mergePublicConfigFromApi(base, apiValues) {
  if (!apiValues || typeof apiValues !== 'object') return { ...base };
  const next = { ...base };
  for (const envKey of BRANDING_ENV_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(apiValues, envKey)) continue;
    const prop = ENV_TO_CONFIG[envKey];
    if (!prop) continue;
    const raw = apiValues[envKey];
    if (raw === undefined || raw === null) continue;
    next[prop] = String(raw);
  }
  if (!next.associationLogoMenu) {
    next.associationLogoMenu = next.associationLogo || '/logo.svg';
  }
  return next;
}

/**
 * Merge GET /config/public?system=kunk values into a Kunk appearance config.
 * @param {ReturnType<typeof getKunkPublicConfig>} base
 * @param {Record<string, string>|null|undefined} apiValues
 */
export function mergeKunkPublicConfigFromApi(base, apiValues) {
  if (!apiValues || typeof apiValues !== 'object') return { ...base };
  const next = { ...base };
  for (const envKey of KUNK_BRANDING_ENV_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(apiValues, envKey)) continue;
    const prop = ENV_TO_KUNK_CONFIG[envKey];
    if (!prop) continue;
    const raw = apiValues[envKey];
    if (raw === undefined || raw === null) continue;
    next[prop] = String(raw);
  }
  if (next.bgMode !== 'image' && next.bgMode !== 'color') {
    next.bgMode = KUNK_APPEARANCE_DEFAULTS.bgMode;
  }
  if (next.defaultTheme !== 'light' && next.defaultTheme !== 'dark') {
    next.defaultTheme = KUNK_APPEARANCE_DEFAULTS.defaultTheme;
  }
  return next;
}
