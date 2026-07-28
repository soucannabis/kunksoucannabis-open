import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function parseEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const raw of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function loadDatabaseUrl() {
  if (process.env.PG_URL) return process.env.PG_URL;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const envPath = path.resolve(__dirname, '../../../../kunk-api/.env');
  const fileEnv = parseEnvFile(envPath);
  if (fileEnv.PG_URL) return fileEnv.PG_URL;
  if (fileEnv.DATABASE_URL) return fileEnv.DATABASE_URL;

  const host = process.env.PGHOST || fileEnv.PGHOST;
  const user = process.env.PGUSER || fileEnv.PGUSER;
  const password = process.env.PGPASSWORD ?? fileEnv.PGPASSWORD;
  const database = process.env.PGDATABASE || fileEnv.PGDATABASE;
  const port = process.env.PGPORT || fileEnv.PGPORT || '5432';
  if (host && user && database && password != null && password !== '') {
    return (
      `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(String(password))}` +
      `@${host}:${port}/${encodeURIComponent(database)}`
    );
  }
  return null;
}

let pool;

export function getPool() {
  if (!pool) {
    const connectionString = loadDatabaseUrl();
    if (!connectionString) throw new Error('PG_URL (ou PGHOST/PG*) ausente para helpers E2E kunk');
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
    await p.query(`DELETE FROM operator_sessions WHERE user_id = $1`, [existing.rows[0].id]).catch(() => {});
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
