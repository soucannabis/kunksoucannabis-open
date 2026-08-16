/**
 * Roda as 4 partes do Admin em sequência.
 *
 * Uso: npm run demo:admin:all
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PARTS = [
  'demo-record-admin-part1.mjs',
  'demo-record-admin-part2.mjs',
  'demo-record-admin-part3.mjs',
  'demo-record-admin-part4.mjs',
];

for (const script of PARTS) {
  const file = join(__dirname, script);
  console.log(`\n▶ ${script}\n`);
  const result = spawnSync(process.execPath, [file], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log('\nOK — 4 partes do Admin gravadas.\n');
