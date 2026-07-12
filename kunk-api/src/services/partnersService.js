'use strict';

const { query } = require('../db/pool');
const itemsRepository = require('../repositories/itemsRepository');
const { stripSensitive } = require('../schema/collections');
const { AppError } = require('../utils/response');

async function byCode(userCode) {
  const result = await query(`SELECT * FROM partners WHERE user_code::text = $1 LIMIT 1`, [userCode]);
  if (!result.rows[0]) throw new AppError(404, 'NOT_FOUND', 'Parceiro não encontrado');
  return stripSensitive('partners', result.rows[0]);
}

async function setFavorite(id, isFavorite) {
  return itemsRepository.updateItem('partners', id, { is_favorite: String(isFavorite) });
}

module.exports = { byCode, setFavorite };
