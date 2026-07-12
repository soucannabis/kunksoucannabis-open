'use strict';

const { can, hasScope, scopeFilterFor } = require('../schema/rbac');
const { AppError } = require('../utils/response');

function authorize(collection, action) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autenticação necessária');
      }

      if (req.auth?.type === 'api_key') {
        if (!hasScope(req.auth.scopes, collection, action)) {
          throw new AppError(403, 'FORBIDDEN', `Sem permissão para ${action} em ${collection}`);
        }
      } else {
        const roles = req.user.roles || req.user.permissions || [];
        if (!can(roles, collection, action)) {
          throw new AppError(403, 'FORBIDDEN', `Sem permissão para ${action} em ${collection}`);
        }
      }

      req.scopeFilter = scopeFilterFor(req.user.roles || req.user.permissions, req.user);
      next();
    } catch (err) {
      next(err);
    }
  };
}

function authorizeAdmin(req, res, next) {
  try {
    const roles = req.user?.roles || req.user?.permissions || [];
    if (req.auth?.type === 'api_key' && req.auth.scopes?.includes('*')) {
      return next();
    }
    if (roles.includes('Administrador') || roles.includes('api')) {
      return next();
    }
    throw new AppError(403, 'FORBIDDEN', 'Apenas administrador');
  } catch (err) {
    next(err);
  }
}

/**
 * Require an exact session role (e.g. Administrador for admin UI routes).
 * Does not accept API keys with only `api` / `*` — use authorizeAdmin for those.
 */
function requireRole(roleName) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'UNAUTHORIZED', 'Autenticação necessária');
      }
      const roles = req.user.roles || req.user.permissions || [];
      const list = Array.isArray(roles) ? roles : [];
      if (!list.includes(roleName)) {
        throw new AppError(403, 'FORBIDDEN', `Role ${roleName} necessária`);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

function authorizeDomain(permission) {
  // permission like "orders.create" → map to collection/action loosely
  const [collection, action] = String(permission).split('.');
  const actionMap = {
    create: 'create',
    read: 'read',
    update: 'update',
    delete: 'delete',
    status: 'update',
    production: 'update',
    payment: 'update',
    complete: 'update',
    attendant: 'update',
    batch: 'update',
    favorite: 'update',
    handbook: 'update',
    run: 'read',
  };
  return authorize(collection, actionMap[action] || 'read');
}

module.exports = { authorize, authorizeAdmin, authorizeDomain, requireRole };
