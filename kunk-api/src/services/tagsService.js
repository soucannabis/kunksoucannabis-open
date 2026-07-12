'use strict';

const { query } = require('../db/pool');

async function listByContext(contexts) {
  if (!contexts) {
    const result = await query(`SELECT * FROM tags ORDER BY id DESC`);
    return result.rows;
  }
  const result = await query(
    `SELECT * FROM tags WHERE contexts ILIKE $1 ORDER BY id DESC`,
    [`%${contexts}%`]
  );
  return result.rows;
}

module.exports = { listByContext };
