import {
  TRIAGE_CONFIG_KEYS,
  getTriageDefaults,
  mergeTriageConfigFromApi,
} from '@kunk/config';

export const TRIAGE_CONFIG_SYSTEM = 'triage';

const KEY_META = {
  [TRIAGE_CONFIG_KEYS.formFields]: {
    value_type: 'json',
    description: 'Campos do formulário público de triagem (padrão)',
    serialize: (v) => JSON.stringify(v ?? []),
  },
  [TRIAGE_CONFIG_KEYS.customFields]: {
    value_type: 'json',
    description: 'Campos personalizados do formulário público de triagem',
    serialize: (v) => JSON.stringify(v ?? []),
  },
  [TRIAGE_CONFIG_KEYS.statuses]: {
    value_type: 'json',
    description: 'Status da fila de triagem (sidebar e menu do avatar)',
    serialize: (v) => JSON.stringify(v ?? []),
  },
  [TRIAGE_CONFIG_KEYS.associateDocs]: {
    value_type: 'boolean',
    description: 'Módulo documentos/dados do associado na triagem',
    serialize: (v) => (v ? 'true' : 'false'),
  },
  [TRIAGE_CONFIG_KEYS.publicFormEnabled]: {
    value_type: 'boolean',
    description: 'Formulário público de triagem habilitado',
    serialize: (v) => (v ? 'true' : 'false'),
  },
};

const VALUE_PROPS = {
  [TRIAGE_CONFIG_KEYS.formFields]: 'formFields',
  [TRIAGE_CONFIG_KEYS.customFields]: 'customFields',
  [TRIAGE_CONFIG_KEYS.statuses]: 'statuses',
  [TRIAGE_CONFIG_KEYS.associateDocs]: 'associateDocs',
  [TRIAGE_CONFIG_KEYS.publicFormEnabled]: 'publicFormEnabled',
};

function valuesEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * @returns {Promise<{ values: ReturnType<typeof getTriageDefaults>, itemsByKey: Record<string, object> }>}
 */
export async function loadTriageConfig(api) {
  const defaults = getTriageDefaults();
  const itemsByKey = {};
  const rawValues = {};

  try {
    const res = await api.configBySystem(TRIAGE_CONFIG_SYSTEM);
    const items = res.data?.items || [];
    for (const item of items) {
      itemsByKey[item.key] = item;
      const raw = item.value ?? item.resolved_value ?? item.hardcoded_default;
      if (raw === undefined || raw === null) continue;
      rawValues[item.key] = raw;
    }
  } catch {
    /* keep defaults */
  }

  return {
    values: mergeTriageConfigFromApi(rawValues),
    itemsByKey,
    defaults,
  };
}

/**
 * Persist only changed triage config keys.
 */
export async function saveTriageConfig(api, nextValues, baselineValues, itemsByKey) {
  const updatedItems = { ...itemsByKey };

  for (const [key, prop] of Object.entries(VALUE_PROPS)) {
    const next = nextValues[prop];
    const prev = baselineValues[prop];
    if (valuesEqual(next, prev)) continue;

    const meta = KEY_META[key];
    const serialized = meta.serialize(next);
    const existing = updatedItems[key];

    if (existing?.id) {
      const res = await api.updateConfig(existing.id, {
        value: serialized,
        description: meta.description,
        value_type: meta.value_type,
      });
      if (res.data) updatedItems[key] = res.data;
    } else {
      const res = await api.createConfig({
        system: TRIAGE_CONFIG_SYSTEM,
        key,
        value: serialized,
        value_type: meta.value_type,
        description: meta.description,
        allow_hardcoded: true,
        hardcoded_default: meta.serialize(getTriageDefaults()[prop]),
        is_sensitive: false,
      });
      if (res.data) updatedItems[key] = res.data;
    }
  }

  return updatedItems;
}

/** Public URL for the Kunk queue form. */
export function getTriagePublicUrl() {
  const base = (
    import.meta.env.VITE_KUNK_PUBLIC_URL
    || import.meta.env.VITE_KUNK_URL
    || 'http://localhost:4257'
  ).replace(/\/$/, '');
  return `${base}/fila`;
}

export function getTriageEmbedSnippet(publicUrl = getTriagePublicUrl()) {
  return `<iframe
  src="${publicUrl}?embed=1"
  title="Formulário de triagem"
  width="100%"
  height="720"
  style="border:0;border-radius:8px;max-width:560px"
  loading="lazy"
  referrerpolicy="no-referrer-when-downgrade"
></iframe>`;
}
