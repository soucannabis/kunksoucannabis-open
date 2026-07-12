'use strict';

const ACTIONS = ['create', 'read', 'update', 'delete'];

/** CRUD shorthand → set of actions */
function expand(mask) {
  const map = { C: 'create', R: 'read', U: 'update', D: 'delete' };
  return new Set([...mask].map((c) => map[c]).filter(Boolean));
}

/**
 * Matriz RBAC v1 — authorization.md
 * R* = read scoped (handled in service layer via scopeFilter)
 */
const MATRIX = {
  Administrador: Object.fromEntries(
    [
      'users', 'system_users', 'orders', 'services', 'products', 'partners', 'institutional_clients',
      'professionals',
      'reception', 'tags', 'reports', 'files', 'orders_files', 'services_files', 'users_files',
      'users_api', 'system_activity',
    ].map((c) => [c, expand('CRUD')])
  ),
  Acolhimento: {
    users: expand('CRUD'),
    system_users: expand('R'),
    orders: expand('CRUD'),
    services: expand('CRUD'),
    products: expand('R'),
    partners: expand('R'),
    institutional_clients: expand('CRUD'),
    professionals: expand('CRUD'),
    reception: expand('CRUD'),
    tags: expand('CRUD'),
    reports: expand('R'),
    files: expand('CRUD'),
    orders_files: expand('CRUD'),
    services_files: expand('CRUD'),
    users_files: expand('CRUD'),
    system_activity: expand('R'),
  },
  Produção: {
    users: expand('R'),
    institutional_clients: expand('R'),
    orders: expand('RU'),
    services: expand('RU'),
    products: expand('RU'),
    professionals: expand('R'),
    reception: expand('RU'),
    tags: expand('R'),
    reports: expand('R'),
    files: expand('R'),
    orders_files: expand('R'),
    services_files: expand('RU'),
    users_files: expand('R'),
    system_activity: expand('R'),
  },
  Financeiro: {
    users: expand('R'),
    institutional_clients: expand('R'),
    orders: expand('RU'),
    services: expand('RU'),
    products: expand('R'),
    partners: expand('R'),
    professionals: expand('R'),
    tags: expand('R'),
    reports: expand('R'),
    files: expand('R'),
    orders_files: expand('R'),
    services_files: expand('R'),
    users_files: expand('R'),
  },
  Parceiro: {
    orders: expand('R'),
    partners: expand('R'),
    reports: expand('R'),
  },
  Prescritor: {
    orders: expand('R'),
    services: expand('R'),
    professionals: expand('R'),
    reports: expand('R'),
  },
  /** Portal do relatório de serviços — escopo via internal_code = professional_code */
  Profissional: {
    services: expand('R'),
    professionals: expand('RU'),
    services_files: expand('R'),
    files: expand('R'),
  },
  api: Object.fromEntries(
    [
      'users', 'system_users', 'orders', 'services', 'products', 'partners', 'institutional_clients',
      'professionals',
      'reception', 'tags', 'reports', 'files', 'orders_files', 'services_files', 'users_files',
      'users_api', 'system_activity',
    ].map((c) => [c, expand('CRUD')])
  ),
};

const SCOPED_ROLES = {
  // partner_code removido do schema; escopo Parceiro redesenhado depois
  Prescritor: { field: 'prescriber_code', fromUser: 'internal_code' },
  // services.professional_id = professionals.professional_code
  Profissional: { field: 'professional_id', fromUser: 'internal_code' },
};

function parseRoles(permissions) {
  if (!permissions) return [];
  if (Array.isArray(permissions)) return permissions;
  try {
    const parsed = JSON.parse(permissions);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* plain string */
  }
  return String(permissions)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function can(roles, collection, action) {
  const list = Array.isArray(roles) ? roles : parseRoles(roles);
  if (list.includes('Administrador') || list.includes('api')) {
    return MATRIX.Administrador[collection]?.has(action) || false;
  }
  for (const role of list) {
    if (MATRIX[role]?.[collection]?.has(action)) return true;
  }
  return false;
}

function scopeFilterFor(roles, user) {
  const list = Array.isArray(roles) ? roles : parseRoles(roles);
  if (list.includes('Administrador') || list.includes('api') || list.includes('Acolhimento')) {
    return null;
  }
  for (const role of list) {
    const cfg = SCOPED_ROLES[role];
    if (cfg && user?.[cfg.fromUser]) {
      return { field: cfg.field, value: user[cfg.fromUser] };
    }
  }
  return null;
}

function hasScope(scopes, collection, action) {
  if (!scopes || scopes.includes('*')) return true;
  const writeActions = new Set(['create', 'update']);
  for (const scope of scopes) {
    if (scope === `items:${collection}:*` || scope === `items:*:*`) return true;
    if (action === 'read' && (scope === `items:${collection}:read` || scope === 'items:*:read')) {
      return true;
    }
    if (writeActions.has(action) && (scope === `items:${collection}:write` || scope === 'items:*:write')) {
      return true;
    }
    if (action === 'delete' && (scope === `items:${collection}:delete` || scope === 'items:*:delete')) {
      return true;
    }
  }
  return false;
}

module.exports = {
  ACTIONS,
  MATRIX,
  SCOPED_ROLES,
  parseRoles,
  can,
  scopeFilterFor,
  hasScope,
};
