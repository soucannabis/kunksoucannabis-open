'use strict';

const { query } = require('../db/pool');
const itemsRepository = require('../repositories/itemsRepository');
const { stripSensitive } = require('../schema/collections');
const { parseInclude, hydrateIncludes } = require('./includeService');
const { v4: uuidv4 } = require('uuid');

async function list(queryParams = {}, { scopeFilter } = {}) {
  const includeKeys = parseInclude('services', queryParams.include);
  const result = await itemsRepository.listItems('services', queryParams, { scopeFilter });
  if (includeKeys.length) {
    await hydrateIncludes('services', result.data, includeKeys);
  }
  return result;
}

async function createService(payload, actor) {
  return itemsRepository.createItem('services', {
    ...payload,
    service_code: payload.service_code || uuidv4(),
    date_created: new Date().toISOString(),
    created_by_user_code: payload.created_by_user_code || actor?.user_code || actor?.internal_code,
  });
}

async function updateService(id, payload) {
  return itemsRepository.updateItem('services', id, payload);
}

async function byProfessional(professionalId, queryParams = {}) {
  const includeKeys = parseInclude('services', queryParams.include);
  const result = await query(
    `SELECT * FROM services WHERE professional_id = $1 ORDER BY id DESC LIMIT 200`,
    [professionalId]
  );
  const rows = result.rows.map((r) => stripSensitive('services', r));
  if (includeKeys.length) {
    await hydrateIncludes('services', rows, includeKeys);
  }
  return rows;
}

async function exists(associateUserCode, professionalId) {
  const result = await query(
    `SELECT id FROM services
     WHERE associate_user_code = $1 AND professional_id = $2
     LIMIT 1`,
    [associateUserCode, professionalId]
  );
  return { exists: Boolean(result.rows[0]), id: result.rows[0]?.id || null };
}

module.exports = { list, createService, updateService, byProfessional, exists };
