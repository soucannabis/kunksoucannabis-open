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
      `UPDATE system_users
       SET password = $1,
           permissions = $2,
           status = 'active',
           name = COALESCE($3, name),
           last_name = COALESCE($4, last_name),
           internal_code = COALESCE($5, internal_code),
           session_token = NULL,
           is_session_active = false
       WHERE id = $6`,
      [hash, JSON.stringify(permissions), name || null, lastName || null, code || null, existing.rows[0].id]
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

export async function ensureDemoAdminUser() {
  return upsertUser({
    email: 'admin@soucannabis.ong.br',
    password: 'Admin@2026!',
    permissions: ['Administrador'],
    name: 'Administrador',
    lastName: 'Sou Cannabis',
    code: 'ADMIN-SOUCANNABIS',
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

/**
 * Garante login de profissional vinculado a `professionals.professional_code`
 * via `system_users.internal_code` (portal /relatorio/servicos).
 */
export async function ensureProfessionalUser({
  email = process.env.DEMO_PROFESSIONAL_EMAIL || 'profissional@soucannabis.ong.br',
  password = process.env.DEMO_PROFESSIONAL_PASSWORD || 'Marina@2026!',
  name = 'Marina',
  lastName = 'Oliveira',
} = {}) {
  const p = getPool();
  const { rows } = await p.query(
    `SELECT professional_code, name, last_name, email
     FROM professionals
     WHERE lower(email) = lower($1)
        OR (name ILIKE $2 AND last_name ILIKE $3)
     ORDER BY CASE WHEN lower(email) = lower($1) THEN 0 ELSE 1 END, id ASC
     LIMIT 1`,
    [email, name, lastName]
  );
  const pro = rows[0];
  if (!pro?.professional_code) {
    throw new Error(`Profissional não encontrado para ${email} / ${name} ${lastName}`);
  }
  return upsertUser({
    email,
    password,
    permissions: ['Profissional'],
    name: pro.name || name,
    lastName: pro.last_name || lastName,
    code: String(pro.professional_code),
  });
}
