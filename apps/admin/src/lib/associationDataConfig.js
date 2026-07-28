import {
  ASSOCIATION_DATA_CONFIG_TO_ENV,
  ASSOCIATION_DATA_DEFAULTS,
  ASSOCIATION_DATA_ENV_KEYS,
} from '@kunk/config';
import { loadKunkAppearance, saveKunkAppearance } from './kunkAppearanceConfig.js';

export const ASSOCIATION_CONFIG_SYSTEM = 'registration';

const KEY_DESCRIPTIONS = {
  VITE_ASSOCIATION_NAME: 'Nome curto da associação (ex.: Minha Associação)',
  VITE_ASSOCIATION_FULL_NAME: 'Nome completo / razão social da associação',
  VITE_ASSOCIATION_EMAIL: 'E-mail de contato da associação',
  VITE_ASSOCIATION_PHONE: 'Telefone de contato da associação',
  VITE_ASSOCIATION_SITE: 'Site da associação',
  VITE_ASSOCIATION_CNPJ: 'CNPJ da associação',
  VITE_ASSOCIATION_CITY: 'Cidade da associação',
  VITE_ASSOCIATION_STATE: 'UF (estado) da associação',
  VITE_ASSOCIATION_LOGO: 'Logo principal da associação',
  VITE_ASSOCIATION_LOGO_MENU: 'Logo da associação no menu',
};

const ASSOCIATION_LOGO_KEYS = ['VITE_ASSOCIATION_LOGO', 'VITE_ASSOCIATION_LOGO_MENU'];

/**
 * Load association identity form values from system_configs (system=registration).
 */
export async function loadAssociationData(api) {
  const values = { ...ASSOCIATION_DATA_DEFAULTS };
  const itemsByKey = {};

  try {
    const res = await api.configBySystem(ASSOCIATION_CONFIG_SYSTEM);
    const items = res.data?.items || [];
    for (const item of items) {
      itemsByKey[item.key] = item;
      const prop = Object.entries(ASSOCIATION_DATA_CONFIG_TO_ENV).find(([, env]) => env === item.key)?.[0];
      if (!prop) continue;
      // Usa o valor persistido (mesmo vazio); não cai no hardcoded do seed.
      values[prop] = item.value == null ? '' : String(item.value);
    }
  } catch {
    /* keep defaults */
  }

  return { values, itemsByKey };
}

/**
 * Persist only changed association identity fields.
 */
export async function saveAssociationData(api, nextValues, baselineValues, itemsByKey) {
  const updatedItems = { ...itemsByKey };

  for (const envKey of ASSOCIATION_DATA_ENV_KEYS) {
    const prop = Object.entries(ASSOCIATION_DATA_CONFIG_TO_ENV).find(([, env]) => env === envKey)?.[0];
    if (!prop) continue;
    const next = String(nextValues[prop] ?? '');
    const prev = String(baselineValues[prop] ?? '');
    if (next === prev) continue;

    const existing = updatedItems[envKey];
    const description = KEY_DESCRIPTIONS[envKey] || envKey;
    const hardcoded = String(ASSOCIATION_DATA_DEFAULTS[prop] ?? '');

    if (existing?.id) {
      const res = await api.updateConfig(existing.id, {
        value: next,
        description,
        value_type: 'string',
      });
      if (res.data) updatedItems[envKey] = res.data;
    } else {
      const res = await api.createConfig({
        system: ASSOCIATION_CONFIG_SYSTEM,
        key: envKey,
        value: next,
        value_type: 'string',
        description,
        allow_hardcoded: true,
        hardcoded_default: hardcoded,
        is_sensitive: false,
      });
      if (res.data) updatedItems[envKey] = res.data;
    }
  }

  return updatedItems;
}

/**
 * Persist association + Kunk logos to the same URL (registration + kunk systems).
 * Also keeps VITE_KUNK_TITLE in sync with associationName when provided.
 */
export async function saveAssociationLogoAndTitle(api, { logo, associationName }) {
  const { values, itemsByKey } = await loadKunkAppearance(api);
  const nextValues = {
    ...values,
    logo: logo == null ? values.logo : String(logo),
    title: associationName != null ? String(associationName).trim() || values.title : values.title,
  };
  await saveKunkAppearance(api, nextValues, values, itemsByKey);

  const logoUrl = String(nextValues.logo || '');
  let regItems = {};
  try {
    const res = await api.configBySystem(ASSOCIATION_CONFIG_SYSTEM);
    for (const item of res.data?.items || []) {
      regItems[item.key] = item;
    }
  } catch {
    /* create below if missing */
  }

  for (const envKey of ASSOCIATION_LOGO_KEYS) {
    const existing = regItems[envKey];
    const description = KEY_DESCRIPTIONS[envKey] || envKey;
    if (existing?.id) {
      if (String(existing.value ?? '') === logoUrl) continue;
      const res = await api.updateConfig(existing.id, {
        value: logoUrl,
        description,
        value_type: 'string',
      });
      if (res.data) regItems[envKey] = res.data;
    } else {
      const res = await api.createConfig({
        system: ASSOCIATION_CONFIG_SYSTEM,
        key: envKey,
        value: logoUrl,
        value_type: 'string',
        description,
        allow_hardcoded: true,
        hardcoded_default: '',
        is_sensitive: false,
      });
      if (res.data) regItems[envKey] = res.data;
    }
  }

  return { logo: logoUrl };
}
