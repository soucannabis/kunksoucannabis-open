'use strict';

const { query } = require('../db/pool');
const itemsRepository = require('../repositories/itemsRepository');
const { stripSensitive } = require('../schema/collections');
const { AppError } = require('../utils/response');

async function list(filters = {}) {
  const params = [];
  const where = [];
  if (filters.active !== undefined) {
    params.push(Number(filters.active));
    where.push(`active = $${params.length}`);
  }
  if (filters.is_prescriber !== undefined) {
    params.push(String(filters.is_prescriber));
    where.push(`is_prescriber = $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const result = await query(
    `SELECT * FROM professionals ${whereSql} ORDER BY id DESC LIMIT 200`,
    params
  );
  return result.rows.map((r) => stripSensitive('professionals', r));
}

async function updateDonationBalance(id, donationBalance) {
  if (donationBalance === undefined || Number.isNaN(Number(donationBalance))) {
    throw new AppError(400, 'VALIDATION_ERROR', 'donation_balance inválido');
  }
  return itemsRepository.updateItem('professionals', id, {
    donation_balance: Number(donationBalance),
  });
}

module.exports = { list, updateDonationBalance };
