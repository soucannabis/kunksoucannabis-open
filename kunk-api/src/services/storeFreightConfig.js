'use strict';

const systemConfigService = require('./systemConfigService');
const { AppError } = require('../utils/response');
const { env } = require('../config/env');

function parseJson(raw, fallback = null) {
  if (raw == null || raw === '') return fallback;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return fallback;
  }
}

function asBool(raw, fallback = false) {
  if (raw == null || raw === '') return fallback;
  if (typeof raw === 'boolean') return raw;
  return String(raw).toLowerCase() === 'true' || String(raw) === '1';
}

async function resolveMap(system) {
  const { values } = await systemConfigService.resolveAll(system);
  return values || {};
}

function getCfg(map, key) {
  return map[key] ?? map[`store.${key}`] ?? null;
}

async function getStoreFreightConfig() {
  const map = await resolveMap('store');
  return {
    apply_to_total: asBool(map['store.freight.apply_to_total'], true),
    ship_from: parseJson(map['store.ship_from'], null),
    package: parseJson(map['store.freight.package'], null),
    label_package: parseJson(map['store.freight.label_package'], null),
    content_declaration: parseJson(map['store.freight.content_declaration'], null),
    default_option: parseJson(map['store.freight.default_option'], null),
    loggi_external_service_ids: parseJson(map['store.freight.loggi.external_service_ids'], null),
    melhorenvio_enabled_service_ids: parseJson(
      map['store.freight.melhorenvio.enabled_service_ids'],
      null
    ),
  };
}

async function getModuleFreightFlags() {
  const map = await resolveMap('modules');
  return {
    loggi: {
      enabled: env.modules.loggi === true,
      use_for_quote: asBool(map['modules.loggi.use_for_quote'], true),
      use_for_label: asBool(map['modules.loggi.use_for_label'], true),
    },
    melhorenvio: {
      enabled: env.modules.melhorenvio === true,
      use_for_quote: asBool(map['modules.melhorenvio.use_for_quote'], true),
      use_for_label: asBool(map['modules.melhorenvio.use_for_label'], false),
    },
    label_provider: map['modules.freight.label_provider'] || 'loggi',
  };
}

function assertShipFrom(shipFrom) {
  if (!shipFrom || typeof shipFrom !== 'object') {
    throw new AppError(400, 'CONFIG_INCOMPLETE', 'store.ship_from não configurado', {
      missing: ['store.ship_from'],
    });
  }
  const required = ['street', 'number', 'city', 'state', 'cep'];
  const missing = required.filter((k) => !String(shipFrom[k] || '').trim());
  if (missing.length) {
    throw new AppError(400, 'CONFIG_INCOMPLETE', 'store.ship_from incompleto', {
      missing: missing.map((k) => `store.ship_from.${k}`),
    });
  }
}

function assertPackage(pkg) {
  if (!pkg || typeof pkg !== 'object') {
    throw new AppError(400, 'CONFIG_INCOMPLETE', 'store.freight.package não configurado', {
      missing: ['store.freight.package'],
    });
  }
  const required = ['weight_g', 'length_cm', 'width_cm', 'height_cm'];
  // also accept camelCase from admin
  const get = (snake, camel) => pkg[snake] ?? pkg[camel];
  const missing = [];
  if (!(Number(get('weight_g', 'weightG')) > 0)) missing.push('weight_g');
  if (!(Number(get('length_cm', 'lengthCm')) > 0)) missing.push('length_cm');
  if (!(Number(get('width_cm', 'widthCm')) > 0)) missing.push('width_cm');
  if (!(Number(get('height_cm', 'heightCm')) > 0)) missing.push('height_cm');
  if (missing.length) {
    throw new AppError(400, 'CONFIG_INCOMPLETE', 'store.freight.package incompleto', {
      missing: missing.map((k) => `store.freight.package.${k}`),
    });
  }
}

function assertContentDeclaration(decl) {
  if (!decl || typeof decl !== 'object') {
    throw new AppError(400, 'CONFIG_INCOMPLETE', 'store.freight.content_declaration não configurado', {
      missing: ['store.freight.content_declaration'],
    });
  }
  const description = String(decl.description || '').trim();
  const totalValue = Number(decl.total_value ?? decl.totalValue);
  if (!description || !(totalValue > 0)) {
    throw new AppError(400, 'CONFIG_INCOMPLETE', 'Declaração de conteúdo incompleta', {
      missing: ['description', 'total_value'],
    });
  }
}

function normalizePackage(pkg) {
  if (!pkg) return null;
  return {
    weightG: Number(pkg.weight_g ?? pkg.weightG),
    lengthCm: Number(pkg.length_cm ?? pkg.lengthCm),
    widthCm: Number(pkg.width_cm ?? pkg.widthCm),
    heightCm: Number(pkg.height_cm ?? pkg.heightCm),
  };
}

function shipFromToLoggi(shipFrom) {
  const line1 = [shipFrom.street, shipFrom.number, shipFrom.neighborhood]
    .map((p) => String(p || '').trim())
    .filter(Boolean)
    .join(' - ');
  return {
    lines: {
      addressLine1: line1,
      addressLine2: String(shipFrom.complement || '').trim(),
      postalCode: String(shipFrom.cep || '').replace(/\D/g, ''),
      city: String(shipFrom.city || '').trim(),
      state: String(shipFrom.state || '').trim(),
      country: 'Brasil',
    },
  };
}

function addressToShipTo(address) {
  const line1 = [address.street, address.number, address.neighborhood]
    .map((p) => String(p || '').trim())
    .filter(Boolean)
    .join(' - ');
  return {
    lines: {
      addressLine1: line1,
      addressLine2: String(address.complement || '').trim(),
      postalCode: String(address.cep || '').replace(/\D/g, ''),
      city: String(address.city || '').trim(),
      state: String(address.state || '').trim(),
      country: 'Brasil',
    },
  };
}

module.exports = {
  getStoreFreightConfig,
  getModuleFreightFlags,
  assertShipFrom,
  assertPackage,
  assertContentDeclaration,
  normalizePackage,
  shipFromToLoggi,
  addressToShipTo,
  parseJson,
  asBool,
};
