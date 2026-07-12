'use strict';

const { loggiRequest } = require('./client');
const storeFreight = require('../storeFreightConfig');
const itemsRepository = require('../../repositories/itemsRepository');
const { AppError } = require('../../utils/response');

async function createLabel({ user, address, name_associate, order_id, freight_option }) {
  const flags = await storeFreight.getModuleFreightFlags();
  if (!flags.loggi.use_for_label) {
    throw new AppError(403, 'LABEL_NOT_ALLOWED', 'Loggi não está habilitada para etiqueta');
  }

  const cfg = await storeFreight.getStoreFreightConfig();
  storeFreight.assertShipFrom(cfg.ship_from);
  storeFreight.assertContentDeclaration(cfg.content_declaration);
  const pkgSource = cfg.label_package || cfg.package;
  storeFreight.assertPackage(pkgSource);
  const pkg = storeFreight.normalizePackage(pkgSource);

  const dce = {
    description: String(cfg.content_declaration.description || '').trim(),
    total_value: Number(cfg.content_declaration.total_value ?? cfg.content_declaration.totalValue),
  };

  const shipFrom = storeFreight.shipFromToLoggi(cfg.ship_from);
  const shipTo = storeFreight.addressToShipTo(address || {});

  const body = {
    shipFrom,
    shipTo,
    packages: [
      {
        ...pkg,
        recipient: {
          name: name_associate || user?.name || 'Destinatário',
        },
        contentDeclaration: {
          description: dce.description,
          totalValue: {
            currencyCode: 'BRL',
            units: String(Math.trunc(dce.total_value)),
            nanos: 0,
          },
        },
      },
    ],
    freightType: freight_option?.freight_type || 'FREIGHT_TYPE_ECONOMIC',
  };

  const response = await loggiRequest('/async-shipments', body, 'POST');

  if (order_id) {
    await itemsRepository.updateItem('orders', order_id, {
      dce,
      tracking_code: response?.trackingCode || response?.loggiKey || null,
      carrier_order_code: response?.id || response?.packageId || null,
      freight_carrier: 'loggi',
    });
  }

  return { ...response, dce };
}

async function cancelPackage({ orderId, tracking_code }) {
  if (!tracking_code) {
    throw new AppError(400, 'VALIDATION_ERROR', 'tracking_code é obrigatório');
  }
  const response = await loggiRequest(`/packages/${encodeURIComponent(tracking_code)}/cancel`, {}, 'POST');
  if (orderId) {
    const orderStatuses = require('../orderStatusesService');
    const statuses = await orderStatuses.getOrderStatuses();
    const paid = orderStatuses.getPaidValue(statuses);
    await itemsRepository.updateItem('orders', orderId, {
      tracking_code: null,
      carrier_order_code: null,
      status: paid,
      date_updated: new Date().toISOString(),
    });
  }
  return response;
}

async function getPackages({ trackingCode }) {
  if (!trackingCode) {
    throw new AppError(400, 'VALIDATION_ERROR', 'trackingCode é obrigatório');
  }
  return loggiRequest(`/packages/${encodeURIComponent(trackingCode)}`, null, 'GET');
}

module.exports = { createLabel, cancelPackage, getPackages };
