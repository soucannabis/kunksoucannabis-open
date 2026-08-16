/**
 * Demo Admin parte 3: CIAP, aparência, importação, sistema e armazenamento.
 *
 * Uso: npm run demo:admin:part3
 */
import { pause } from './demo-lib.mjs';
import { runAdminPart3Tour } from './demo-admin-part3-4-flows.mjs';
import { loginAdmin, startAdminDemo } from './demo-admin-shared.mjs';

async function main() {
  const { page, closeAndSave, adminUrl, holdMs } = await startAdminDemo(
    'parte 3 — CIAP, aparência e sistema',
    'admin-part3'
  );

  try {
    await loginAdmin(page, adminUrl);
    await runAdminPart3Tour(page);
    await pause(page, holdMs, 'hold final parte 3');
  } finally {
    await closeAndSave();
  }
}

main().catch((err) => {
  console.error('\nFALHA:', err?.message || err);
  process.exit(1);
});
