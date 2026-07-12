'use strict';

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db/pool');
const { AppError } = require('../utils/response');
const { env } = require('../config/env');
const professionalsService = require('./professionalsService');
const systemUsersService = require('./systemUsersService');
const { isCollaboratorTrue } = require('../utils/professionalFlags');

const INVITE_TTL_MS = 60 * 60 * 1000; // 1h

function inviteSecret() {
  return (
    process.env.SYSTEM_INVITE_SECRET ||
    env.configEncryptKey ||
    process.env.SESSION_SECRET ||
    'dev-invite-secret-change-me'
  );
}

function signPayload(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', inviteSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token) {
  const raw = String(token || '');
  const parts = raw.split('.');
  if (parts.length !== 2) throw new AppError(400, 'INVALID_INVITE', 'Convite inválido');
  const [body, sig] = parts;
  const expected = crypto.createHmac('sha256', inviteSecret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new AppError(400, 'INVALID_INVITE', 'Convite inválido');
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    throw new AppError(400, 'INVALID_INVITE', 'Convite inválido');
  }
  if (!payload?.exp || Date.now() > Number(payload.exp)) {
    throw new AppError(400, 'INVITE_EXPIRED', 'Convite expirado');
  }
  return payload;
}

function publicAppBase() {
  return (
    process.env.KUNK_PUBLIC_URL ||
    process.env.PUBLIC_APP_URL ||
    'http://localhost:4257'
  ).replace(/\/$/, '');
}

async function findPortalUserByCode(professionalCode) {
  const result = await query(
    `SELECT * FROM system_users
     WHERE internal_code::text = $1
     ORDER BY id DESC
     LIMIT 20`,
    [String(professionalCode)]
  );
  return result.rows.find((row) => {
    const perms = String(row.permissions || '');
    return perms.includes('Profissional');
  }) || null;
}

async function ensurePortalUser(professional) {
  if (!isCollaboratorTrue(professional.is_collaborator)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Só colaboradores podem ter acesso ao relatório');
  }
  const email = String(professional.email || '').trim().toLowerCase();
  if (!email) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Profissional precisa de e-mail para criar conta');
  }

  let user = await findPortalUserByCode(professional.professional_code);
  if (user) return user;

  const existingEmail = await query(
    `SELECT id FROM system_users WHERE LOWER(TRIM(email)) = $1 LIMIT 1`,
    [email]
  );
  if (existingEmail.rows[0]) {
    throw new AppError(
      409,
      'EMAIL_IN_USE',
      'Já existe um usuário do sistema com este e-mail'
    );
  }

  user = await systemUsersService.createSystemUser({
    name: professional.name,
    last_name: professional.last_name || null,
    email,
    permissions: JSON.stringify(['Profissional']),
    internal_code: String(professional.professional_code),
    status: 'pending',
    user_code: uuidv4(),
    date_created: new Date().toISOString(),
  });
  return user;
}

function buildInvite(user, professional) {
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  const token = signPayload({
    system_user_id: user.id,
    email: user.email,
    professional_code: professional.professional_code,
    permissions: ['Profissional'],
    exp: expiresAt.getTime(),
  });
  const inviteUrl = `${publicAppBase()}/cadastro?token=${encodeURIComponent(token)}`;
  return {
    system_user_id: user.id,
    invite_url: inviteUrl,
    expires_at: expiresAt.toISOString(),
    email_sent: false,
    email_status: 'module_not_configured',
  };
}

async function createPortalAccess(professionalId) {
  const professional = await professionalsService.getById(professionalId);
  const user = await ensurePortalUser(professional);
  return buildInvite(user, professional);
}

async function resendPortalAccess(professionalId) {
  const professional = await professionalsService.getById(professionalId);
  const user = await findPortalUserByCode(professional.professional_code);
  if (!user) {
    return createPortalAccess(professionalId);
  }
  return buildInvite(user, professional);
}

async function previewInvite(token) {
  const payload = verifyToken(token);
  return {
    email: payload.email,
    expires_at: new Date(payload.exp).toISOString(),
    professional_code: payload.professional_code,
  };
}

async function acceptInvite(body) {
  const payload = verifyToken(body?.token);
  const password = String(body?.password || '');
  if (password.length < 8) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Senha deve ter no mínimo 8 caracteres');
  }
  if (!/[A-Z]/.test(password) || !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Senha precisa de maiúscula e caractere especial'
    );
  }

  const userId = payload.system_user_id;
  const existing = await systemUsersService.getSystemUser(userId);
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Usuário do convite não encontrado');
  if (String(existing.email || '').toLowerCase() !== String(payload.email || '').toLowerCase()) {
    throw new AppError(400, 'INVALID_INVITE', 'Convite não corresponde ao usuário');
  }

  const updated = await systemUsersService.updateSystemUser(userId, {
    password,
    status: 'active',
    name: body.name != null ? body.name : existing.name,
    last_name: body.last_name != null ? body.last_name : existing.last_name,
    permissions: JSON.stringify(['Profissional']),
    internal_code: payload.professional_code || existing.internal_code,
  });

  return { user: updated };
}

module.exports = {
  createPortalAccess,
  resendPortalAccess,
  previewInvite,
  acceptInvite,
  verifyToken,
  INVITE_TTL_MS,
};
