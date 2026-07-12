'use strict';

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db/pool');
const { stripSensitive } = require('../schema/collections');
const { AppError } = require('../utils/response');
const { env } = require('../config/env');

const SALT_ROUNDS = process.env.NODE_ENV === 'test' ? 4 : 10;
const RESET_TTL_MS = 60 * 60 * 1000; // documented TTL; SQL uses interval '1 hour'

function parseInvalidFields(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(raw)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

function publicAssociate(row) {
  if (!row) return null;
  const clean = stripSensitive('users', row);
  delete clean.password_reset_token;
  delete clean.password_reset_expires;
  delete clean.session_expires;
  delete clean.last_activity;
  delete clean.is_session_active;
  return {
    ...clean,
    invalid_fields: parseInvalidFields(clean.invalid_fields),
    associate_status: Number(clean.associate_status) || 1,
  };
}

async function findByEmailAccount(email) {
  const result = await query(
    `SELECT * FROM users
     WHERE lower(email_account) = lower($1)
       AND (status IS NULL OR status <> 'patient')
     LIMIT 1`,
    [email]
  );
  return result.rows[0] || null;
}

async function findBySessionToken(token) {
  const result = await query(
    `SELECT * FROM users
     WHERE session_token = $1 AND is_session_active = true
       AND (status IS NULL OR status <> 'patient')
     LIMIT 1`,
    [token]
  );
  return result.rows[0] || null;
}

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function createSession(userId) {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + env.sessionMaxHours * 3600 * 1000);
  await query(
    `UPDATE users SET
      session_token = $1,
      session_expires = $2,
      last_activity = NOW(),
      is_session_active = true
     WHERE id = $3`,
    [sessionToken, expires, userId]
  );
  return { sessionToken, expires };
}

async function logout(sessionToken) {
  if (!sessionToken) return;
  await query(
    `UPDATE users SET
      is_session_active = false,
      session_token = NULL
     WHERE session_token = $1`,
    [sessionToken]
  );
}

async function touchSession(userId) {
  const expires = new Date(Date.now() + env.sessionMaxHours * 3600 * 1000);
  await query(
    `UPDATE users SET last_activity = NOW(), session_expires = $1 WHERE id = $2`,
    [expires, userId]
  );
}

async function resolveSession(sessionToken) {
  if (!sessionToken) return null;
  const user = await findBySessionToken(sessionToken);
  if (!user) return null;
  if (user.session_expires && new Date(user.session_expires) < new Date()) {
    await logout(sessionToken);
    return null;
  }
  await touchSession(user.id);
  return publicAssociate(user);
}

async function resolveSessionRow(sessionToken) {
  if (!sessionToken) return null;
  const user = await findBySessionToken(sessionToken);
  if (!user) return null;
  if (user.session_expires && new Date(user.session_expires) < new Date()) {
    await logout(sessionToken);
    return null;
  }
  await touchSession(user.id);
  return user;
}

function accountState(user) {
  if (!user) return 'none';
  if (String(user.status) === 'Associado') return 'associado';
  const phase = Number(user.associate_status) || 0;
  if (phase >= 1 && phase <= 5) return 'in_progress';
  return 'none';
}

const MIN_PASSWORD_LENGTH = 8;

function assertPassword(password) {
  if (!password || String(password).length < MIN_PASSWORD_LENGTH) {
    throw new AppError(400, 'VALIDATION_ERROR', `Senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres`, {
      password: [`mínimo ${MIN_PASSWORD_LENGTH} caracteres`],
    });
  }
}

async function registerEmail(email, password) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) {
    throw new AppError(400, 'VALIDATION_ERROR', 'email é obrigatório', {
      email: ['obrigatório'],
    });
  }
  assertPassword(password);

  const existing = await findByEmailAccount(normalized);
  if (existing) {
    const state = accountState(existing);
    if (state === 'associado') {
      throw new AppError(409, 'ACCOUNT_EXISTS', 'Conta já existe. Faça login.');
    }
    if (state === 'in_progress') {
      throw new AppError(409, 'ACCOUNT_IN_PROGRESS', 'Cadastro em andamento. Faça login para retomar.');
    }
  }

  const passwordHash = await hashPassword(String(password));
  const userCode = uuidv4();
  const result = await query(
    `INSERT INTO users (
      email_account, email, account_password, associate_status, status, user_code,
      date_created, created_date, invalid_fields
    ) VALUES ($1, $1, $2, 1, NULL, $3, NOW(), NOW(), $4)
    RETURNING *`,
    [normalized, passwordHash, userCode, JSON.stringify([])]
  );

  const { sessionToken, expires } = await createSession(result.rows[0].id);
  const refreshed = await query(`SELECT * FROM users WHERE id = $1`, [result.rows[0].id]);
  return { user: publicAssociate(refreshed.rows[0]), sessionToken, expires };
}

async function login(email, password) {
  if (!email || !password) {
    throw new AppError(400, 'VALIDATION_ERROR', 'email e password são obrigatórios', {
      email: email ? undefined : ['obrigatório'],
      password: password ? undefined : ['obrigatório'],
    });
  }

  const user = await findByEmailAccount(String(email).trim());
  if (!user || !user.account_password) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Credenciais inválidas');
  }

  let valid = false;
  let needsRehash = false;
  if (user.account_password.startsWith('$2')) {
    valid = await bcrypt.compare(password, user.account_password);
  } else {
    valid = user.account_password === password;
    needsRehash = valid;
  }

  if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Credenciais inválidas');
  }

  if (needsRehash) {
    const hash = await hashPassword(password);
    await query(`UPDATE users SET account_password = $1 WHERE id = $2`, [hash, user.id]);
  }

  const { sessionToken, expires } = await createSession(user.id);
  const refreshed = await query(`SELECT * FROM users WHERE id = $1`, [user.id]);
  return { user: publicAssociate(refreshed.rows[0]), sessionToken, expires };
}

async function forgotPassword(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) {
    throw new AppError(400, 'VALIDATION_ERROR', 'email é obrigatório');
  }

  const user = await findByEmailAccount(normalized);
  let resetToken = null;
  if (user) {
    resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(resetToken);
    await query(
      `UPDATE users SET
         password_reset_token = $1,
         password_reset_expires = NOW() + interval '1 hour'
       WHERE id = $2`,
      [tokenHash, user.id]
    );
  }

  return {
    ok: true,
    message: 'Se o e-mail existir, enviaremos instruções de redefinição.',
    // Exposed only in test for QA without mailer
    ...(process.env.NODE_ENV === 'test' && resetToken ? { reset_token: resetToken } : {}),
  };
}

async function resetPassword(token, password) {
  if (!token || !password) {
    throw new AppError(400, 'VALIDATION_ERROR', 'token e password são obrigatórios');
  }
  assertPassword(password);

  const tokenHash = hashResetToken(token);
  const result = await query(
    `SELECT * FROM users
     WHERE password_reset_token = $1
       AND password_reset_expires > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  const user = result.rows[0];
  if (!user) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Token inválido ou expirado');
  }

  const hash = await hashPassword(password);
  await query(
    `UPDATE users SET
      account_password = $1,
      password_reset_token = NULL,
      password_reset_expires = NULL
     WHERE id = $2`,
    [hash, user.id]
  );

  return { ok: true };
}

async function getById(id) {
  const result = await query(`SELECT * FROM users WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

module.exports = {
  publicAssociate,
  parseInvalidFields,
  findByEmailAccount,
  accountState,
  registerEmail,
  login,
  logout,
  resolveSession,
  resolveSessionRow,
  forgotPassword,
  resetPassword,
  hashPassword,
  getById,
  createSession,
};
