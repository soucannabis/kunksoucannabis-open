'use strict';

const { query } = require('../db/pool');
const itemsRepository = require('../repositories/itemsRepository');
const { AppError } = require('../utils/response');
const { stripSensitive } = require('../schema/collections');
const { parseInclude, truthyParam, hydrateIncludes, hydratePatients } = require('./includeService');
const { assertUserDeletable } = require('./linkGuards');
const associateAuthRepository = require('../repositories/associateAuthRepository');
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
    `SELECT id, user_code, associate_name, associate_last_name, email, email_account, associate_cpf,
            mobile_number, status, associate_status, patient_user_code, fullname,
            TRIM(CONCAT(COALESCE(associate_name, ''), ' ', COALESCE(associate_last_name, ''))) AS full_name
     FROM users
     WHERE associate_name ILIKE $1
        OR associate_last_name ILIKE $1
        OR email ILIKE $1
        OR email_account ILIKE $1
        OR associate_cpf ILIKE $1
        OR mobile_number ILIKE $1
        OR fullname ILIKE $1
     ORDER BY id DESC
     LIMIT 50`,
    [term]
  );
  return result.rows.map((r) => ({
    ...stripSensitive('users', r),
    full_name: (r.fullname || r.full_name || '').trim() || null,
  }));
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

async function getById(id, queryParams = {}) {
  const row = await itemsRepository.getItem('users', id, queryParams);
  const rows = [row];
  if (truthyParam(queryParams.patients)) {
    await hydratePatients(rows);
  }
  return rows[0];
}

/**
 * Painel: criar associado só com e-mail (sem senha do funil).
 * Respeita ACCOUNT_EXISTS / ACCOUNT_IN_PROGRESS.
 */
async function createUserFromPanel(payload = {}) {
  const email = String(payload.email_account || payload.email || '')
    .trim()
    .toLowerCase();
  if (!email || !email.includes('@')) {
    throw new AppError(400, 'VALIDATION_ERROR', 'email é obrigatório');
  }

  const existing = await associateAuthRepository.findByEmailAccount(email);
  if (existing) {
    const state = associateAuthRepository.accountState(existing);
    if (state === 'associado') {
      throw new AppError(409, 'ACCOUNT_EXISTS', 'Conta já existe', {
        user_code: existing.user_code,
        id: existing.id,
      });
    }
    if (state === 'in_progress') {
      throw new AppError(409, 'ACCOUNT_IN_PROGRESS', 'Cadastro em andamento', {
        user_code: existing.user_code,
        id: existing.id,
      });
    }
  }

  const now = new Date().toISOString();
  return itemsRepository.createItem('users', {
    email_account: email,
    email,
    associate_status: 1,
    status: payload.status || 'published',
    user_code: payload.user_code || uuidv4(),
    date_created: now,
    created_date: now,
    associate_name: payload.associate_name || null,
    associate_last_name: payload.associate_last_name || null,
  });
}

async function createUser(payload) {
  if (payload?.panel === true || (payload?.email_account && !payload?.account_password && !payload?.status?.includes?.('patient'))) {
    const { panel, ...rest } = payload;
    if (panel === true || (!payload.responsible_code && !payload.account_password)) {
      return createUserFromPanel(rest);
    }
  }
  const body = {
    ...payload,
    user_code: payload.user_code || uuidv4(),
    date_created: payload.date_created || new Date().toISOString(),
  };
  delete body.panel;
  return itemsRepository.createItem('users', body);
}

async function updateUser(id, payload = {}) {
  const body = { ...payload };
  delete body.account_password;
  delete body.session_token;
  delete body.password_reset_token;

  if (body.annotations != null && typeof body.annotations !== 'string') {
    body.annotations = JSON.stringify(body.annotations);
  }

  return itemsRepository.updateItem('users', id, body);
}

async function makeAssociate(id) {
  return updateUser(id, { status: 'Associado', associate_status: 5 });
}

async function getPatients(id) {
  const user = await itemsRepository.getItem('users', id);
  const code = user.user_code;
  const result = await query(
    `SELECT * FROM users WHERE responsible_code = $1 ORDER BY id DESC`,
    [code]
  );
  return result.rows.map((r) => stripSensitive('users', r));
}

async function createPatient(responsibleId, payload = {}) {
  const responsible = await itemsRepository.getItem('users', responsibleId);
  if (String(responsible.status) === 'patient') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Pacientes não podem ter pacientes');
  }
  const now = new Date().toISOString();
  const body = {
    ...payload,
    status: 'patient',
    responsible_type: payload.responsible_type || 'patient',
    responsible_code: responsible.user_code,
    user_code: payload.user_code || uuidv4(),
    date_created: now,
    created_date: now,
    email_account: payload.email_account || responsible.email_account || responsible.email || null,
    email: payload.email || responsible.email || responsible.email_account || null,
  };
  delete body.id;
  delete body.account_password;
  return itemsRepository.createItem('users', body);
}

async function updatePatient(responsibleId, patientId, payload = {}) {
  const responsible = await itemsRepository.getItem('users', responsibleId);
  const patient = await itemsRepository.getItem('users', patientId);
  if (String(patient.responsible_code) !== String(responsible.user_code)) {
    throw new AppError(404, 'NOT_FOUND', 'Paciente não pertence a este responsável');
  }
  const body = { ...payload };
  delete body.responsible_code;
  delete body.user_code;
  delete body.account_password;
  delete body.status;
  if (body.annotations != null && typeof body.annotations !== 'string') {
    body.annotations = JSON.stringify(body.annotations);
  }
  return itemsRepository.updateItem('users', patientId, body);
}

async function deletePatient(responsibleId, patientId) {
  const responsible = await itemsRepository.getItem('users', responsibleId);
  const patient = await itemsRepository.getItem('users', patientId);
  if (String(patient.responsible_code) !== String(responsible.user_code)) {
    throw new AppError(404, 'NOT_FOUND', 'Paciente não pertence a este responsável');
  }
  await assertUserDeletable(patient);
  return itemsRepository.deleteItem('users', patientId);
}

async function getHistory(id) {
  const user = await itemsRepository.getItem('users', id);
  const code = user.user_code;
  const [orders, services] = await Promise.all([
    query(
      `SELECT id, order_code, status, associate_name, total, discount, donation, items, tags,
              created_date, date_created, tracking_code, prescriber
       FROM orders
       WHERE user_code::text = $1 OR "user" = $2
       ORDER BY COALESCE(created_date, date_created) DESC NULLS LAST
       LIMIT 100`,
      [String(code), user.id]
    ),
    query(
      `SELECT id, service_code, booking_group_code, status, associate_name, patient_name,
              patient_user_code, professional_name, price, donation, price_paid, tags,
              consultation_date, date_created
       FROM services
       WHERE associate_user_code = $1 OR patient_user_code = $1
       ORDER BY COALESCE(consultation_date, date_created) DESC NULLS LAST
       LIMIT 100`,
      [code]
    ),
  ]);
  return {
    orders: orders.rows,
    services: services.rows,
  };
}

async function deleteUser(id) {
  const user = await itemsRepository.getItem('users', id);
  await assertUserDeletable(user);
  return itemsRepository.deleteItem('users', id);
}

async function updateHandbook(id, handbook) {
  return itemsRepository.updateItem('users', id, { handbook });
}

module.exports = {
  list,
  searchUsers,
  getByCode,
  getById,
  createUser,
  createUserFromPanel,
  updateUser,
  makeAssociate,
  getPatients,
  createPatient,
  updatePatient,
  deletePatient,
  getHistory,
  deleteUser,
  updateHandbook,
};
