import {
  ASSOCIATION_DATA_CONFIG_TO_ENV,
  ASSOCIATION_DATA_DEFAULTS,
  ASSOCIATION_DATA_ENV_KEYS,
  LOGO_FORMAT_SQUARE,
  normalizeLogoFormat,
  resolveActiveBrandingLogo,
  resolveBrandingLogoUrl,
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
  VITE_ASSOCIATION_LOGO: 'Logo ativa da associação (resolvida pelo formato)',
  VITE_ASSOCIATION_LOGO_MENU: 'Logo da associação no menu (espelha a ativa)',
  VITE_ASSOCIATION_LOGO_SQUARE: 'Logo quadrada (1:1) da associação',
  VITE_ASSOCIATION_LOGO_RECTANGULAR: 'Logo retangular (3:1) da associação',
  VITE_ASSOCIATION_LOGO_FORMAT: 'Formato de logo ativo: square | rectangular',
};

const ASSOCIATION_LOGO_KEYS = [
  'VITE_ASSOCIATION_LOGO',
  'VITE_ASSOCIATION_LOGO_MENU',
  'VITE_ASSOCIATION_LOGO_SQUARE',
  'VITE_ASSOCIATION_LOGO_RECTANGULAR',
  'VITE_ASSOCIATION_LOGO_FORMAT',
];

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
      values[prop] = item.value == null ? '' : String(item.value);
    }
  } catch {
    /* keep defaults */
  }

  return { values, itemsByKey };
}

/**
 * Load square/rectangular logos + active format (with legacy fallback).
 */
export async function loadAssociationLogos(api) {
  const { values: appearance } = await loadKunkAppearance(api);
  let items = {};
  try {
    const res = await api.configBySystem(ASSOCIATION_CONFIG_SYSTEM);
    for (const item of res.data?.items || []) {
      items[item.key] = item;
    }
  } catch {
    /* empty */
  }

  const legacy = resolveBrandingLogoUrl(
    appearance.logo,
    items.VITE_ASSOCIATION_LOGO?.value,
    items.VITE_ASSOCIATION_LOGO_MENU?.value,
  );
  const logoSquare = resolveBrandingLogoUrl(
    items.VITE_ASSOCIATION_LOGO_SQUARE?.value,
    legacy,
  );
  const logoRectangular = resolveBrandingLogoUrl(
    items.VITE_ASSOCIATION_LOGO_RECTANGULAR?.value,
  );
  const logoFormat = normalizeLogoFormat(
    items.VITE_ASSOCIATION_LOGO_FORMAT?.value || LOGO_FORMAT_SQUARE,
  );
  const active = resolveActiveBrandingLogo({
    format: logoFormat,
    square: logoSquare,
    rectangular: logoRectangular,
    legacy,
  });

  return {
    logoSquare,
    logoRectangular,
    logoFormat: active.format,
    logo: active.url,
    itemsByKey: items,
  };
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

async function upsertRegKey(api, regItems, envKey, value) {
  const description = KEY_DESCRIPTIONS[envKey] || envKey;
  const nextValue = String(value ?? '');
  const existing = regItems[envKey];
  if (existing?.id) {
    if (String(existing.value ?? '') === nextValue) return;
    const res = await api.updateConfig(existing.id, {
      value: nextValue,
      description,
      value_type: 'string',
    });
    if (res.data) regItems[envKey] = res.data;
    return;
  }
  const res = await api.createConfig({
    system: ASSOCIATION_CONFIG_SYSTEM,
    key: envKey,
    value: nextValue,
    value_type: 'string',
    description,
    allow_hardcoded: true,
    hardcoded_default: envKey === 'VITE_ASSOCIATION_LOGO_FORMAT' ? LOGO_FORMAT_SQUARE : '',
    is_sensitive: false,
  });
  if (res.data) regItems[envKey] = res.data;
}

/**
 * Persist square + rectangular logos, active format, and sync Kunk active URL.
 */
export async function saveAssociationLogoAndTitle(api, {
  logo,
  logoSquare,
  logoRectangular,
  logoFormat,
  associationName,
} = {}) {
  let regItems = {};
  try {
    const res = await api.configBySystem(ASSOCIATION_CONFIG_SYSTEM);
    for (const item of res.data?.items || []) {
      regItems[item.key] = item;
    }
  } catch {
    /* create below */
  }

  const currentSquare =
    logoSquare !== undefined
      ? resolveBrandingLogoUrl(logoSquare)
      : logo !== undefined
        ? resolveBrandingLogoUrl(logo)
        : resolveBrandingLogoUrl(
            regItems.VITE_ASSOCIATION_LOGO_SQUARE?.value,
            regItems.VITE_ASSOCIATION_LOGO?.value,
          );
  const currentRect =
    logoRectangular !== undefined
      ? resolveBrandingLogoUrl(logoRectangular)
      : resolveBrandingLogoUrl(regItems.VITE_ASSOCIATION_LOGO_RECTANGULAR?.value);
  const currentFormat = normalizeLogoFormat(
    logoFormat !== undefined ? logoFormat : regItems.VITE_ASSOCIATION_LOGO_FORMAT?.value,
  );
  const active = resolveActiveBrandingLogo({
    format: currentFormat,
    square: currentSquare,
    rectangular: currentRect,
  });

  const { values, itemsByKey } = await loadKunkAppearance(api);
  const nextValues = {
    ...values,
    logo: active.url,
    title: associationName != null ? String(associationName).trim() || values.title : values.title,
  };
  await saveKunkAppearance(api, nextValues, values, itemsByKey);

  const writes = {
    VITE_ASSOCIATION_LOGO_SQUARE: currentSquare,
    VITE_ASSOCIATION_LOGO_RECTANGULAR: currentRect,
    VITE_ASSOCIATION_LOGO_FORMAT: active.format,
    VITE_ASSOCIATION_LOGO: active.url,
    VITE_ASSOCIATION_LOGO_MENU: active.url,
  };

  for (const envKey of ASSOCIATION_LOGO_KEYS) {
    await upsertRegKey(api, regItems, envKey, writes[envKey] ?? '');
  }

  return {
    logo: active.url,
    logoSquare: currentSquare,
    logoRectangular: currentRect,
    logoFormat: active.format,
  };
}
