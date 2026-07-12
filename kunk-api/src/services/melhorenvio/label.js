'use strict';

const { meRequest } = require('./auth');
const storeFreight = require('../storeFreightConfig');
const itemsRepository = require('../../repositories/itemsRepository');
const { AppError } = require('../../utils/response');

async function createLabel({ user, address, name_associate, order_id, order_code, freight_option }) {
  const flags = await storeFreight.getModuleFreightFlags();
  if (!flags.melhorenvio.use_for_label) {
    throw new AppError(403, 'LABEL_NOT_ALLOWED', 'Melhor Envio não está habilitado para etiqueta');
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

  const serviceId = freight_option?.service_id;
  if (!serviceId) {
    throw new AppError(400, 'VALIDATION_ERROR', 'freight_option.service_id é obrigatório');
  }

  const from = cfg.ship_from;
  const to = address || {};

  const cartBody = {
    service: serviceId,
    from: {
      name: from.name || from.company_name || 'Remetente',
      phone: from.phone || '',
      email: from.email || '',
      document: from.document || from.cnpj || '',
      address: from.street,
      number: from.number,
      complement: from.complement || '',
      district: from.neighborhood || '',
      city: from.city,
      country_id: 'BR',
      postal_code: String(from.cep || '').replace(/\D/g, ''),
      state_abbr: from.state,
    },
    to: {
      name: name_associate || user?.name || 'Destinatário',
      address: to.street,
      number: to.number,
      complement: to.complement || '',
      district: to.neighborhood || '',
      city: to.city,
      country_id: 'BR',
      postal_code: String(to.cep || '').replace(/\D/g, ''),
      state_abbr: to.state,
    },
    products: [
      {
        name: dce.description,
        quantity: 1,
        unitary_value: dce.total_value,
      },
    ],
    volumes: [
      {
        height: pkg.heightCm,
        width: pkg.widthCm,
        length: pkg.lengthCm,
        weight: pkg.weightG / 1000,
      },
    ],
    options: {
      insurance_value: dce.total_value,
      tags: order_code ? [{ tag: String(order_code) }] : [],
    },
  };

  const cart = await meRequest('/me/cart', cartBody, 'POST');

  if (order_id) {
    await itemsRepository.updateItem('orders', order_id, {
      dce,
      carrier_order_code: cart?.id || null,
      freight_carrier: 'melhorenvio',
    });
  }

  return { cart, dce };
}

async function clearOrderLabel(orderId) {
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

/**
 * Cancel Melhor Envio shipment/cart item.
 * Upstream: POST /me/shipment/cancel [{ id, reason_id: 2, description }]
 */
async function cancelLabel({ orderId, order: orderArg } = {}) {
  const flags = await storeFreight.getModuleFreightFlags();
  if (!flags.melhorenvio.use_for_label) {
    throw new AppError(403, 'LABEL_NOT_ALLOWED', 'Melhor Envio não está habilitado para etiqueta');
  }

  const order =
    orderArg ||
    (orderId ? await itemsRepository.getItem('orders', orderId) : null);
  if (!order) throw new AppError(404, 'NOT_FOUND', 'Pedido não encontrado');

  const shipmentId = order.carrier_order_code || order.tracking_code;
  if (!shipmentId) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Pedido sem carrier_order_code para cancelar');
  }

  // Preview (best-effort)
  try {
    await meRequest('/me/shipment/cancel-preview', { orders: [String(shipmentId)] }, 'POST');
  } catch {
    /* continue — cancel may still work for cart items */
  }

  let response;
  try {
    response = await meRequest(
      '/me/shipment/cancel',
      [
        {
          id: String(shipmentId),
          reason_id: 2,
          description: 'Cancelamento via Kunk',
        },
      ],
      'POST'
    );
  } catch (err) {
    // Cart items may need DELETE /me/cart/{id}
    try {
      response = await meRequest(`/me/cart/${encodeURIComponent(shipmentId)}`, null, 'DELETE');
    } catch {
      throw err;
    }
  }

  await clearOrderLabel(order.id || orderId);
  return response || { ok: true };
}

module.exports = { createLabel, cancelLabel };
