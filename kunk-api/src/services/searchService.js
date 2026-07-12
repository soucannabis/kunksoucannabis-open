'use strict';

const { query } = require('../db/pool');
const { AppError } = require('../utils/response');

async function globalSearch(q, entity) {
  if (!q || String(q).trim().length < 2) {
    throw new AppError(400, 'VALIDATION_ERROR', 'q deve ter ao menos 2 caracteres');
  }
  const term = `%${q}%`;
  const entities = entity ? [entity] : ['users', 'orders', 'partners', 'professionals', 'services'];
  const out = {};

  if (entities.includes('users')) {
    const r = await query(
      `SELECT id, associate_name, associate_last_name, email, user_code FROM users
       WHERE associate_name ILIKE $1 OR email ILIKE $1 OR associate_cpf ILIKE $1 LIMIT 20`,
      [term]
    );
    out.users = r.rows;
  }
  if (entities.includes('orders')) {
    const r = await query(
      `SELECT id, associate_name, status, order_code FROM orders
       WHERE associate_name ILIKE $1 OR status ILIKE $1 LIMIT 20`,
      [term]
    );
    out.orders = r.rows;
  }
  if (entities.includes('partners')) {
    const r = await query(
      `SELECT id, first_name, last_name, email, user_code FROM partners
       WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1 LIMIT 20`,
      [term]
    );
    out.partners = r.rows;
  }
  if (entities.includes('professionals')) {
    const r = await query(
      `SELECT id, name, last_name, email, specialty FROM professionals
       WHERE name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1 LIMIT 20`,
      [term]
    );
    out.professionals = r.rows;
  }
  if (entities.includes('services')) {
    const r = await query(
      `SELECT id, name, associate_name, professional_name, status FROM services
       WHERE name ILIKE $1 OR associate_name ILIKE $1 OR professional_name ILIKE $1 LIMIT 20`,
      [term]
    );
    out.services = r.rows;
  }

  return out;
}

module.exports = { globalSearch };
