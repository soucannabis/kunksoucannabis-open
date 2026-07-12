'use strict';

const itemsRepository = require('../repositories/itemsRepository');
const { AppError } = require('../utils/response');
const { query } = require('../db/pool');

async function updateBatch(id, batch) {
  if (batch === undefined) throw new AppError(400, 'VALIDATION_ERROR', 'batch é obrigatório');
  return itemsRepository.updateItem('products', id, { batch });
}

async function syncBatches(items = []) {
  const updated = [];
  for (const item of items) {
    if (!item.id) continue;
    const row = await itemsRepository.updateItem('products', item.id, { batch: item.batch });
    updated.push(row);
  }
  return { updated: updated.length, items: updated };
}

async function listProducts() {
  const result = await query(`SELECT id, name, sku, batch, amount, status FROM products ORDER BY id DESC`);
  return result.rows;
}

module.exports = { updateBatch, syncBatches, listProducts };
