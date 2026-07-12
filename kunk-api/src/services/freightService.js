'use strict';

const storeFreight = require('./storeFreightConfig');
const { AppError } = require('../utils/response');
const { env } = require('../config/env');
const systemConfigService = require('./systemConfigService');
const { LOGGI_SERVICE_CATALOG } = require('./freightNormalize');

async function quoteAll(address) {
  if (!address?.cep) {
    throw new AppError(400, 'VALIDATION_ERROR', 'address.cep é obrigatório');
  }

  const cfg = await storeFreight.getStoreFreightConfig();
  const flags = await storeFreight.getModuleFreightFlags();
  const options = [];
  const errors = [];

  if (flags.loggi.enabled && flags.loggi.use_for_quote) {
    try {
      const loggiQuote = require('./loggi/quote');
      const result = await loggiQuote.quoteFreight(address);
      options.push(...(result.options || []));
    } catch (err) {
      if (err.code === 'CONFIG_INCOMPLETE') throw err;
      errors.push({ provider: 'loggi', code: err.code, message: err.message });
    }
  }

  if (flags.melhorenvio.enabled && flags.melhorenvio.use_for_quote) {
    try {
      const meQuote = require('./melhorenvio/quote');
      const result = await meQuote.quote({ address });
      options.push(...(result.options || []));
    } catch (err) {
      if (err.code === 'CONFIG_INCOMPLETE') throw err;
      errors.push({ provider: 'melhorenvio', code: err.code, message: err.message });
    }
  }

  if (!options.length) {
    // If no providers enabled, still check config so admin knows what's missing
    if (!flags.loggi.enabled && !flags.melhorenvio.enabled) {
      throw new AppError(400, 'FREIGHT_NO_QUOTE', 'Nenhum provedor de frete habilitado para cotação', {
        errors,
      });
    }
    throw new AppError(400, 'FREIGHT_NO_QUOTE', 'Nenhuma cotação disponível', { errors });
  }

  const defaultKey = cfg.default_option?.option_key || null;
  const ready = options.filter((o) => o.status === 'ready');
  let selected = ready.find((o) => o.option_key === defaultKey) || null;
  if (!selected && ready.length) {
    selected = ready.reduce((best, o) => (!best || o.price < best.price ? o : best), null);
  }

  return {
    apply_to_total: cfg.apply_to_total,
    default_option_key: defaultKey,
    selected_option_key: selected?.option_key || null,
    options,
    errors: errors.length ? errors : undefined,
  };
}

async function getServiceOptions() {
  const flags = await storeFreight.getModuleFreightFlags();
  const options = [];

  if (flags.loggi.enabled || true) {
    // Always expose Loggi catalog for admin favorites UI (static enum)
    options.push(
      ...LOGGI_SERVICE_CATALOG.map((o) => ({
        ...o,
        provider: 'loggi',
        company_name: 'Loggi',
        service_label: o.label,
      }))
    );
  }

  if (env.modules.melhorenvio) {
    try {
      const meQuote = require('./melhorenvio/quote');
      const me = await meQuote.listServices();
      options.push(...(me.options || []));
    } catch {
      /* ME catalog optional when not authenticated */
    }
  }

  return { options };
}

async function getDefaultOption() {
  const cfg = await storeFreight.getStoreFreightConfig();
  return { default_option: cfg.default_option };
}

async function setDefaultOption(option, actor) {
  if (!option || !option.option_key) {
    throw new AppError(400, 'VALIDATION_ERROR', 'option_key é obrigatório');
  }
  const listed = await systemConfigService.listBySystem('store');
  const row = (listed || []).find((r) => r.key === 'store.freight.default_option');
  const value = JSON.stringify(option);
  if (row?.id) {
    await systemConfigService.updateConfig(row.id, { value });
  } else {
    await systemConfigService.createConfig({
      system: 'store',
      key: 'store.freight.default_option',
      value,
      value_type: 'json',
      is_sensitive: false,
      is_required: false,
      allow_hardcoded: false,
      description: 'Favorito de entrega',
    });
  }
  return { default_option: option, updated_by: actor?.email || actor?.user_code || null };
}

module.exports = {
  quoteAll,
  getServiceOptions,
  getDefaultOption,
  setDefaultOption,
};
