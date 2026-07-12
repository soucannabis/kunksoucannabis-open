'use strict';

const { v4: uuidv4 } = require('uuid');

/** Minimal create payloads per collection for integration CRUD */
function createPayload(collection) {
  switch (collection) {
    case 'tags':
      return { tag: `t-${Date.now()}`, contexts: 'orders', color: '#000' };
    case 'files':
      return { filename: 'a.txt', mime_type: 'text/plain', storage_path: '/tmp/a.txt' };
    case 'users':
      return { associate_name: 'Test', email: `u${Date.now()}@t.com`, user_code: uuidv4(), status: 'active' };
    case 'system_users':
      return {
        name: 'Op',
        last_name: 'Test',
        email: `op${Date.now()}@t.com`,
        permissions: '["Acolhimento"]',
        status: 'active',
      };
    case 'partners':
      return { status: 'active', first_name: 'P', last_name: 'T', email: `p${Date.now()}@t.com`, user_code: uuidv4() };
    case 'products':
      return { status: 'active', name: 'Prod', sku: `SKU-${Date.now()}`, batch: 'B1' };
    case 'professionals':
      return { name: 'Dr', last_name: 'X', email: `dr${Date.now()}@t.com`, professional_code: uuidv4() };
    case 'reception':
      return { name: 'R', last_name: 'T', status: 'open', code: uuidv4() };
    case 'reports':
      return { name: 'Rep', report_code: uuidv4(), type: 'table' };
    case 'services':
      return { name: 'Svc', status: 'pending', service_code: uuidv4() };
    case 'orders':
      return { status: 'Novo', associate_name: 'A', order_code: uuidv4(), total: 10 };
    case 'users_api':
      return { email: `api${Date.now()}@t.com`, token: 'hashed-placeholder' };
    case 'orders_files':
    case 'services_files':
    case 'users_files':
      return null; // handled with deps
    default:
      return {};
  }
}

function patchPayload(collection) {
  switch (collection) {
    case 'tags':
      return { color: '#fff' };
    case 'products':
      return { batch: 'B2' };
    case 'orders':
      return { status: 'Atualizado' };
    case 'users':
      return { annotations: 'note' };
    case 'partners':
      return { is_favorite: 'true' };
    case 'professionals':
      return { specialty: 'geral' };
    case 'reception':
      return { attendant: 'admin' };
    case 'reports':
      return { type: 'chart' };
    case 'services':
      return { status: 'done' };
    case 'system_users':
      return { city: 'SP' };
    case 'files':
      return { filename: 'b.txt' };
    case 'users_api':
      return { email: `upd${Date.now()}@t.com` };
    default:
      return {};
  }
}

module.exports = { createPayload, patchPayload };
