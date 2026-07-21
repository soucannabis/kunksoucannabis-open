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

/** Force status/fase for E2E pós-termo (QA only). */
export async function forceAssociateStatus(email, { status = 'Associado', associate_status = 'assinatura_termo' } = {}) {
  const pool = new pg.Pool({ connectionString: loadDatabaseUrl() });
  try {
    await pool.query(
      `UPDATE users SET status = $1, associate_status = $2, date_updated = NOW()
       WHERE lower(email_account) = lower($3)`,
      [status, associate_status, email]
    );
  } finally {
    await pool.end();
  }
}

/** @deprecated use forceAssociateStatus */
export async function forceAssociatePhase(email, phase) {
  if (phase === 5 || phase === 'associado' || phase === 'consulta') {
    return forceAssociateStatus(email, { status: 'Associado', associate_status: 'assinatura_termo' });
  }
  return forceAssociateStatus(email, { status: null, associate_status: phase });
}

/**
 * Remove o associado (e pacientes vinculados) criados no E2E, mais arquivos e termos.
 * Usa e-mail exato — não apaga sample data.
 */
export async function deleteAssociateByEmail(email) {
  if (!email) return { deletedUsers: 0 };
  const pool = new pg.Pool({ connectionString: loadDatabaseUrl() });
  try {
    const { rows: roots } = await pool.query(
      `SELECT id, user_code FROM users WHERE lower(email_account) = lower($1)`,
      [email]
    );
    if (!roots.length) return { deletedUsers: 0 };

    const rootCodes = roots.map((r) => r.user_code).filter(Boolean);
    const { rows: patients } = await pool.query(
      `SELECT id, user_code FROM users
       WHERE responsible_code = ANY($1::uuid[])
          OR user_code::text IN (
               SELECT patient_user_code FROM users
               WHERE user_code = ANY($1::uuid[])
                 AND patient_user_code IS NOT NULL
                 AND patient_user_code <> ''
             )`,
      [rootCodes]
    );

    const allUsers = [...roots, ...patients];
    const userIds = [...new Set(allUsers.map((u) => u.id))];
    const userCodes = [...new Set(allUsers.map((u) => u.user_code).filter(Boolean))];

    await pool.query(
      `DELETE FROM term_events WHERE contract_id IN (
         SELECT id FROM term_contracts WHERE user_code = ANY($1::uuid[])
       )`,
      [userCodes]
    );
    await pool.query(
      `DELETE FROM term_signatures WHERE contract_id IN (
         SELECT id FROM term_contracts WHERE user_code = ANY($1::uuid[])
       )`,
      [userCodes]
    );

    const { rows: contractFiles } = await pool.query(
      `SELECT filled_pdf_file_id AS id FROM term_contracts WHERE user_code = ANY($1::uuid[])
       UNION
       SELECT signed_pdf_file_id FROM term_contracts WHERE user_code = ANY($1::uuid[])
       UNION
       SELECT audit_pdf_file_id FROM term_contracts WHERE user_code = ANY($1::uuid[])`,
      [userCodes]
    );
    await pool.query(`DELETE FROM term_contracts WHERE user_code = ANY($1::uuid[])`, [userCodes]);

    const { rows: ufFiles } = await pool.query(
      `SELECT file_id AS id FROM users_files WHERE user_id = ANY($1::int[])`,
      [userIds]
    );
    await pool.query(`DELETE FROM users_files WHERE user_id = ANY($1::int[])`, [userIds]);

    const fileIds = [...contractFiles, ...ufFiles]
      .map((r) => r.id)
      .filter(Boolean);

    if (fileIds.length) {
      await pool.query(
        `UPDATE term_signatures SET image_file_id = NULL WHERE image_file_id = ANY($1::uuid[])`,
        [fileIds]
      );
      await pool.query(`DELETE FROM files WHERE id = ANY($1::uuid[])`, [fileIds]);
    }

    await pool.query(
      `UPDATE users SET patient_user_code = NULL
       WHERE user_code = ANY($1::uuid[])`,
      [userCodes]
    );
    await pool.query(
      `UPDATE users SET responsible_code = NULL
       WHERE responsible_code = ANY($1::uuid[])`,
      [userCodes]
    );

    // Pacientes primeiro (FK responsible_code ON DELETE SET NULL, mas ordem segura)
    const patientIds = patients.map((p) => p.id);
    if (patientIds.length) {
      await pool.query(`DELETE FROM users WHERE id = ANY($1::int[])`, [patientIds]);
    }
    await pool.query(`DELETE FROM users WHERE id = ANY($1::int[])`, [roots.map((r) => r.id)]);

    return { deletedUsers: userIds.length, fileIds: fileIds.length };
  } finally {
    await pool.end();
  }
}

/** Remove contatos de triagem criados pelo E2E (e-mail exato). */
export async function deleteReceptionByEmail(email) {
  if (!email) return { deleted: 0 };
  const pool = new pg.Pool({ connectionString: loadDatabaseUrl() });
  try {
    const res = await pool.query(
      `DELETE FROM reception WHERE lower(email) = lower($1)`,
      [email]
    );
    return { deleted: res.rowCount || 0 };
  } finally {
    await pool.end();
  }
}
