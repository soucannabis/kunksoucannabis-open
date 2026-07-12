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

  it('Parceiro has no auto scope after partner_code removal', () => {
    const scope = scopeFilterFor(['Parceiro'], { internal_code: 'P1' });
    assert.equal(scope, null);
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
});
