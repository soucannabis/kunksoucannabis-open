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
    if (!connectionString) throw new Error('DATABASE_URL ausente para helpers E2E doc-sign');
    pool = new pg.Pool({ connectionString });
  }
  return pool;
}

async function hashPassword(password) {
  const authRepository = require('../../../../kunk-api/src/repositories/authRepository.js');
  return authRepository.hashPassword(password);
}

export async function ensureAdminUser() {
  const email = 'admin@kunk-api.test';
  const password = 'TestAdmin123!';
  const p = getPool();
  const hash = await hashPassword(password);
  const existing = await p.query(`SELECT id FROM system_users WHERE email = $1`, [email]);
  if (existing.rows[0]) {
    await p.query(
      `UPDATE system_users SET password = $1, permissions = $2, status = 'active',
        session_token = NULL, is_session_active = false WHERE id = $3`,
      [hash, JSON.stringify(['Administrador']), existing.rows[0].id]
    );
  } else {
    await p.query(
      `INSERT INTO system_users (email, password, name, last_name, permissions, status, internal_code, date_created)
       VALUES ($1,$2,'Admin','Test',$3,'active','ADMIN-TEST',NOW())`,
      [email, hash, JSON.stringify(['Administrador'])]
    );
  }
  return { email, password };
}
