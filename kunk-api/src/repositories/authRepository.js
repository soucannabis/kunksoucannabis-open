'use strict';

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { query } = require('../db/pool');
const { stripSensitive } = require('../schema/collections');
const { AppError } = require('../utils/response');
const { env } = require('../config/env');
const { parseRoles } = require('../schema/rbac');

const SALT_ROUNDS = process.env.NODE_ENV === 'test' ? 4 : 10;

function publicUser(row) {
  if (!row) return null;
  const clean = stripSensitive('system_users', row);
  return {
    id: clean.id,
    user_code: clean.user_code,
    name: clean.name,
    last_name: clean.last_name,
    email: clean.email,
    permissions: parseRoles(clean.permissions),
    internal_code: clean.internal_code,
    status: clean.status,
  };
}

async function findByEmail(email) {
  const result = await query(
    `SELECT * FROM system_users WHERE lower(email) = lower($1) LIMIT 1`,
    [email]
  );
  return result.rows[0] || null;
}

async function findBySessionToken(token) {
  const result = await query(
    `SELECT * FROM system_users
     WHERE session_token = $1 AND is_session_active = true
     LIMIT 1`,
    [token]
  );
  return result.rows[0] || null;
}

async function login(email, password) {
  if (!email || !password) {
    throw new AppError(400, 'VALIDATION_ERROR', 'email e password são obrigatórios', {
      email: email ? undefined : ['obrigatório'],
      password: password ? undefined : ['obrigatório'],
    });
  }

  const user = await findByEmail(email);
  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Credenciais inválidas');
  }

  if (user.status && String(user.status).toLowerCase() === 'inactive') {
    throw new AppError(403, 'USER_INACTIVE', 'Usuário inativo');
  }

  let valid = false;
  if (user.password && user.password.startsWith('$2')) {
    valid = await bcrypt.compare(password, user.password);
  } else if (user.password) {
    valid = user.password === password;
  }

  if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Credenciais inválidas');
  }

  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + env.sessionMaxHours * 3600 * 1000);

  await query(
    `UPDATE system_users SET
      session_token = $1,
      session_expires = $2,
      last_activity = NOW(),
      is_session_active = true
     WHERE id = $3`,
    [sessionToken, expires, user.id]
  );

  const refreshed = await query(`SELECT * FROM system_users WHERE id = $1`, [user.id]);
  return { user: publicUser(refreshed.rows[0]), sessionToken, expires };
}

async function logout(sessionToken) {
  if (!sessionToken) return;
  await query(
    `UPDATE system_users SET
      is_session_active = false,
      session_token = NULL
     WHERE session_token = $1`,
    [sessionToken]
  );
}

async function touchSession(userId) {
  const expires = new Date(Date.now() + env.sessionMaxHours * 3600 * 1000);
  await query(
    `UPDATE system_users SET last_activity = NOW(), session_expires = $1 WHERE id = $2`,
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
  return publicUser(user);
}

function parseStoredTokenMeta(emailField) {
  let label = emailField || 'api-token';
  let scopes = ['*'];
  try {
    const parsed = JSON.parse(emailField);
    label = parsed.label || emailField;
    scopes = parsed.scopes || ['*'];
  } catch {
    /* plain label */
  }
  return { label, scopes };
}

function publicTokenRow(row) {
  const { label, scopes } = parseStoredTokenMeta(row.email);
  return { id: row.id, email: label, label, scopes };
}

async function createApiToken({ email, label: labelIn, scopes = ['*'] }) {
  const { normalizeApiTokenScopes } = require('../schema/rbac');
  let normalizedScopes;
  try {
    normalizedScopes = normalizeApiTokenScopes(scopes);
  } catch (err) {
    throw new AppError(400, err.code || 'VALIDATION_ERROR', err.message);
  }
  const plaintext = `kunk_live_${crypto.randomBytes(24).toString('hex')}`;
  const hash = await bcrypt.hash(plaintext, SALT_ROUNDS);
  const label = String(labelIn || email || 'api-token').trim() || 'api-token';
  // Store scopes in email field as JSON prefix for v1 schema (email + token only)
  const storedEmail = JSON.stringify({ label, scopes: normalizedScopes });

  const result = await query(
    `INSERT INTO users_api (email, token) VALUES ($1, $2) RETURNING id, email`,
    [storedEmail, hash]
  );

  return {
    id: result.rows[0].id,
    email: label,
    label,
    scopes: normalizedScopes,
    token: plaintext,
  };
}

async function listApiTokens() {
  const result = await query(`SELECT id, email FROM users_api ORDER BY id DESC`);
  return result.rows.map(publicTokenRow);
}

async function updateApiToken(id, { email, label: labelIn, scopes } = {}) {
  const { normalizeApiTokenScopes } = require('../schema/rbac');
  const existing = await query(`SELECT id, email FROM users_api WHERE id = $1`, [id]);
  if (!existing.rows[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Token não encontrado');
  }
  const current = parseStoredTokenMeta(existing.rows[0].email);
  const label =
    labelIn !== undefined || email !== undefined
      ? String(labelIn || email || '').trim() || current.label
      : current.label;
  let nextScopes = current.scopes;
  if (scopes !== undefined) {
    try {
      nextScopes = normalizeApiTokenScopes(scopes);
    } catch (err) {
      throw new AppError(400, err.code || 'VALIDATION_ERROR', err.message);
    }
  }
  const storedEmail = JSON.stringify({ label, scopes: nextScopes });
  const result = await query(
    `UPDATE users_api SET email = $2 WHERE id = $1 RETURNING id, email`,
    [id, storedEmail]
  );
  return publicTokenRow(result.rows[0]);
}

async function revokeApiToken(id) {
  const result = await query(`DELETE FROM users_api WHERE id = $1 RETURNING id`, [id]);
  if (!result.rows[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Token não encontrado');
  }
  return { id: result.rows[0].id };
}

async function resolveBearer(token) {
  if (!token) return null;
  // Prefer hashed tokens; fall back to plaintext legacy rows
  const result = await query(`SELECT id, email, token FROM users_api ORDER BY id DESC LIMIT 100`);
  for (const row of result.rows) {
    if (!row.token) continue;
    let match = false;
    if (row.token.startsWith('$2')) {
      match = await bcrypt.compare(token, row.token);
    } else {
      match = row.token === token;
    }
    if (match) {
      const { label, scopes } = parseStoredTokenMeta(row.email);
      return {
        id: row.id,
        email: label,
        scopes,
        roles: ['api'],
      };
    }
  }
  return null;
}

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function assertOperatorPassword(password) {
  if (!password || String(password).length < 8) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Senha deve ter no mínimo 8 caracteres');
  }
  if (!/[A-Z]/.test(password) || !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Senha precisa de maiúscula e caractere especial'
    );
  }
}

const OPERATOR_RESET_APPS = new Set(['kunk', 'admin', 'doc-sign']);

async function forgotPassword(email, app = 'kunk') {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) {
    throw new AppError(400, 'VALIDATION_ERROR', 'email é obrigatório');
  }
  const appKey = String(app || 'kunk').toLowerCase();
  if (!OPERATOR_RESET_APPS.has(appKey)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'app inválido (kunk|admin|doc-sign)');
  }

  const user = await findByEmail(normalized);
  let resetToken = null;
  if (user && String(user.status || '').toLowerCase() !== 'inactive') {
    resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(resetToken);
    await query(
      `UPDATE system_users SET
         password_reset_token = $1,
         password_reset_expires = NOW() + interval '1 hour'
       WHERE id = $2`,
      [tokenHash, user.id]
    );

    try {
      const emailService = require('../services/email');
      const resetUrl = `${emailService.publicAppUrl(appKey)}/nova-senha?token=${encodeURIComponent(resetToken)}`;
      const tpl = emailService.templates.passwordReset({
        resetUrl,
        associationName: process.env.ASSOCIATION_NAME || null,
      });
      await emailService.sendTemplated(normalized, tpl);
    } catch {
      /* ignore mailer errors */
    }
  }

  return {
    ok: true,
    message: 'Se o e-mail existir, enviaremos instruções de redefinição.',
    ...(process.env.NODE_ENV === 'test' && resetToken ? { reset_token: resetToken } : {}),
  };
}

async function resetPassword(token, password) {
  if (!token || !password) {
    throw new AppError(400, 'VALIDATION_ERROR', 'token e password são obrigatórios');
  }
  assertOperatorPassword(password);

  const tokenHash = hashResetToken(token);
  const result = await query(
    `SELECT * FROM system_users
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
    `UPDATE system_users SET
      password = $1,
      password_reset_token = NULL,
      password_reset_expires = NULL,
      session_token = NULL,
      is_session_active = false,
      status = CASE WHEN lower(coalesce(status, '')) = 'pending' THEN 'active' ELSE status END,
      date_updated = NOW()
     WHERE id = $2`,
    [hash, user.id]
  );

  return { ok: true };
}

module.exports = {
  publicUser,
  findByEmail,
  login,
  logout,
  resolveSession,
  createApiToken,
  listApiTokens,
  updateApiToken,
  revokeApiToken,
  resolveBearer,
  hashPassword,
  forgotPassword,
  resetPassword,
  assertOperatorPassword,
  OPERATOR_RESET_APPS,
};
