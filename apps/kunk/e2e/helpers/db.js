import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.resolve(__dirname, '../../../../kunk-api/.env');
  if (!fs.existsSync(envPath)) return null;
  const text = fs.readFileSync(envPath, 'utf8');
  const line = text.split('\n').find((l) => l.startsWith('DATABASE_URL='));
  if (!line) return null;
  return line.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
}

let pool;

export function getPool() {
  if (!pool) {
    const connectionString = loadDatabaseUrl();
    if (!connectionString) throw new Error('DATABASE_URL ausente para helpers E2E kunk');
    pool = new pg.Pool({ connectionString });
  }
  return pool;
}

async function hashPassword(password) {
  const authRepository = require('../../../../kunk-api/src/repositories/authRepository.js');
  return authRepository.hashPassword(password);
}

async function upsertUser({ email, password, permissions, name, lastName, code }) {
  const p = getPool();
  const hash = await hashPassword(password);
  const existing = await p.query(`SELECT id FROM system_users WHERE email = $1`, [email]);
  if (existing.rows[0]) {
    await p.query(
      `UPDATE system_users SET password = $1, permissions = $2, status = 'active',
        session_token = NULL, is_session_active = false WHERE id = $3`,
      [hash, JSON.stringify(permissions), existing.rows[0].id]
    );
  } else {
    await p.query(
      `INSERT INTO system_users (email, password, name, last_name, permissions, status, internal_code, date_created)
       VALUES ($1,$2,$3,$4,$5,'active',$6,NOW())`,
      [email, hash, name, lastName, JSON.stringify(permissions), code]
    );
  }
  return { email, password };
}

export async function ensureAdminUser() {
  return upsertUser({
    email: 'admin@kunk-api.test',
    password: 'TestAdmin123!',
    permissions: ['Administrador'],
    name: 'Admin',
    lastName: 'Test',
    code: 'ADMIN-TEST',
  });
}

export async function ensureAcolhimentoUser() {
  return upsertUser({
    email: 'acolhimento@kunk-api.test',
    password: 'TestAcol123!',
    permissions: ['Acolhimento'],
    name: 'Acol',
    lastName: 'Test',
    code: 'ACOL-TEST',
  });
}

export async function ensureFinanceiroUser() {
  return upsertUser({
    email: 'financeiro@kunk-api.test',
    password: 'TestFinanceiro123!',
    permissions: ['Financeiro'],
    name: 'Financeiro',
    lastName: 'Test',
    code: 'FIN-TEST',
  });
}
