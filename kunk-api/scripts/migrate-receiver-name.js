'use strict';

const { Client } = require('pg');

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS receiver_name VARCHAR(255)');
  await c.query(`
    UPDATE orders
    SET receiver_name = associate_name
    WHERE receiver_name IS NULL
      AND associate_name IS NOT NULL
      AND TRIM(associate_name) <> ''
  `);
  const r = await c.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'orders' AND column_name = 'receiver_name'`
  );
  console.log('receiver_name column:', r.rows);
  await c.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
