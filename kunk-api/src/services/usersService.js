'use strict';

const { query } = require('../db/pool');
const itemsRepository = require('../repositories/itemsRepository');
const { AppError } = require('../utils/response');
const { stripSensitive } = require('../schema/collections');
const { parseInclude, truthyParam, hydrateIncludes, hydratePatients } = require('./includeService');
const { v4: uuidv4 } = require('uuid');

async function list(queryParams = {}, { scopeFilter } = {}) {
  const includeKeys = parseInclude('users', queryParams.include);
  const withPatients = truthyParam(queryParams.patients);
  const result = await itemsRepository.listItems('users', queryParams, { scopeFilter });
  if (includeKeys.length) {
    await hydrateIncludes('users', result.data, includeKeys);
  }
  if (withPatients) {
    await hydratePatients(result.data);
  }
  return result;
}

async function searchUsers(q) {
  if (!q || String(q).trim().length < 2) {
    throw new AppError(400, 'VALIDATION_ERROR', 'q deve ter ao menos 2 caracteres');
  }
  const term = `%${q}%`;
  const result = await query(
    `SELECT id, user_code, associate_name, associate_last_name, email, associate_cpf, mobile_number, status
     FROM users
     WHERE associate_name ILIKE $1
        OR associate_last_name ILIKE $1
        OR email ILIKE $1
        OR associate_cpf ILIKE $1
        OR mobile_number ILIKE $1
        OR fullname ILIKE $1
     ORDER BY id DESC
     LIMIT 50`,
    [term]
  );
  return result.rows;
}

async function getByCode(userCode, queryParams = {}) {
  const result = await query(`SELECT * FROM users WHERE user_code::text = $1 LIMIT 1`, [userCode]);
  if (!result.rows[0]) throw new AppError(404, 'NOT_FOUND', 'Usuário não encontrado');
  const row = stripSensitive('users', result.rows[0]);
  const rows = [row];
  const includeKeys = parseInclude('users', queryParams.include);
  if (includeKeys.length) {
    await hydrateIncludes('users', rows, includeKeys);
  }
  if (truthyParam(queryParams.patients)) {
    await hydratePatients(rows);
  }
  return rows[0];
}

async function createUser(payload) {
  const body = {
    ...payload,
    user_code: payload.user_code || uuidv4(),
    date_created: new Date().toISOString(),
  };
  return itemsRepository.createItem('users', body);
}

async function updateUser(id, payload) {
  return itemsRepository.updateItem('users', id, payload);
}

async function getPatients(id) {
  const user = await itemsRepository.getItem('users', id);
  const code = user.user_code;
  const result = await query(
    `SELECT id, user_code, associate_name, associate_last_name, responsible_code, responsible_type, status
     FROM users
     WHERE responsible_code = $1
     ORDER BY id DESC`,
    [code]
  );
  return result.rows.map((r) => stripSensitive('users', r));
}

async function updateHandbook(id, handbook) {
  return itemsRepository.updateItem('users', id, { handbook });
}

module.exports = {
  list,
  searchUsers,
  getByCode,
  createUser,
  updateUser,
  getPatients,
  updateHandbook,
};
