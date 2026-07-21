'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { can, hasScope, parseRoles, scopeFilterFor } = require('../../src/schema/rbac');

describe('rbac', () => {
  it('Administrador can CRUD all core collections', () => {
    assert.equal(can(['Administrador'], 'orders', 'delete'), true);
    assert.equal(can(['Administrador'], 'users_api', 'create'), true);
  });

  it('Produção cannot create users', () => {
    assert.equal(can(['Produção'], 'users', 'create'), false);
    assert.equal(can(['Produção'], 'users', 'read'), true);
  });

  it('Profissional scopes services by professional_id from internal_code', () => {
    const scope = scopeFilterFor(['Profissional'], { internal_code: 'uuid-pro-1' });
    assert.deepEqual(scope, { field: 'professional_id', value: 'uuid-pro-1' });
    assert.equal(can(['Profissional'], 'services', 'read'), true);
    assert.equal(can(['Profissional'], 'services', 'update'), false);
  });

  it('parses permissions JSON and CSV', () => {
    assert.deepEqual(parseRoles('["Administrador"]'), ['Administrador']);
    assert.deepEqual(parseRoles('Acolhimento,Produção'), ['Acolhimento', 'Produção']);
  });

  it('api scopes map to actions', () => {
    assert.equal(hasScope(['items:orders:read'], 'orders', 'read'), true);
    assert.equal(hasScope(['items:orders:read'], 'orders', 'delete'), false);
    assert.equal(hasScope(['*'], 'users', 'delete'), true);
  });

  it('normalizeApiTokenScopes validates collections and actions', () => {
    const { normalizeApiTokenScopes, API_TOKEN_COLLECTIONS } = require('../../src/schema/rbac');
    assert.ok(API_TOKEN_COLLECTIONS.includes('orders'));
    assert.ok(!API_TOKEN_COLLECTIONS.includes('users_api'));
    assert.deepEqual(normalizeApiTokenScopes(['*']), ['*']);
    assert.deepEqual(
      normalizeApiTokenScopes(['items:orders:read', 'items:products:write']),
      ['items:orders:read', 'items:products:write']
    );
    assert.throws(() => normalizeApiTokenScopes(['items:users_api:read']), /users_api/);
    assert.throws(() => normalizeApiTokenScopes(['bogus']), /inválido/i);
  });
});
