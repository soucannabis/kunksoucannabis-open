'use strict';

const { Client } = require('pg');

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query(`
    UPDATE orders o
    SET
      associate_name = TRIM(BOTH FROM CONCAT(COALESCE(u.associate_name, ''), ' ', COALESCE(u.associate_last_name, ''))),
      receiver_name = CASE
        WHEN o.receiver_name IS NULL
          OR TRIM(o.receiver_name) = ''
          OR TRIM(o.receiver_name) = TRIM(COALESCE(o.associate_name, ''))
        THEN TRIM(BOTH FROM CONCAT(COALESCE(u.associate_name, ''), ' ', COALESCE(u.associate_last_name, '')))
        ELSE o.receiver_name
      END,
      date_updated = NOW()
    FROM users u
    WHERE (o."user" = u.id OR (o.user_code IS NOT NULL AND o.user_code::text = u.user_code::text))
      AND COALESCE(TRIM(u.associate_last_name), '') <> ''
      AND (
        o.associate_name IS NULL
        OR TRIM(o.associate_name) = TRIM(COALESCE(u.associate_name, ''))
      )
    RETURNING o.id, o.associate_name, o.receiver_name
  `);
  console.log('updated', r.rowCount);
  console.log(r.rows.slice(0, 8));
  await c.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
