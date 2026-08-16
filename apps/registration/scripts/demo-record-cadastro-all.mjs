/**
 * Roda as demos desktop + mobile do cadastramento em sequência.
 *
 * Uso:
 *   cd apps/registration && npm run demo:cadastro:all
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(__dirname, 'demo-record-cadastro.mjs');

function run(label, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n======== ${label} ========\n`);
    const child = spawn(process.execPath, [SCRIPT, ...args], {
      stdio: 'inherit',
      env: process.env,
      cwd: join(__dirname, '..'),
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} falhou (exit ${code})`));
    });
    child.on('error', reject);
  });
}

async function main() {
  await run('DEMO DESKTOP', []);
  await run('DEMO MOBILE', ['--mobile']);
  console.log('\nOK — demos desktop + mobile concluídas.\n');
}

main().catch((err) => {
  console.error('\nFALHA:', err?.message || err);
  process.exit(1);
});
