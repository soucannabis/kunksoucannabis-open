import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.resolve(__dirname, '../../../../kunk-api/.env');
  const raw = fs.readFileSync(envPath, 'utf8');
  const line = raw.split('\n').find((l) => l.startsWith('DATABASE_URL='));
  if (!line) throw new Error('DATABASE_URL not found');
  return line.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
}

/** Force associate_status for E2E phase-5 scenarios (QA only). */
export async function forceAssociatePhase(email, phase) {
  const pool = new pg.Pool({ connectionString: loadDatabaseUrl() });
  try {
    await pool.query(
      `UPDATE users SET associate_status = $1, date_updated = NOW()
       WHERE lower(email_account) = lower($2)`,
      [phase, email]
    );
  } finally {
    await pool.end();
  }
}
