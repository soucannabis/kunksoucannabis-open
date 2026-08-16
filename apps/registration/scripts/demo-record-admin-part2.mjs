/**
 * Demo Admin parte 2: profissionais, loja e permissões.
 *
 * Uso: npm run demo:admin:part2
 */
import { pause } from './demo-lib.mjs';
import { runAdminPart2Tour } from './demo-admin-part1-2-flows.mjs';
import {
  loginAdmin,
  restoreAdminProfessionalTypes,
  snapshotAdminProfessionalTypes,
  startAdminDemo,
} from './demo-admin-shared.mjs';

async function main() {
  const { page, closeAndSave, adminUrl, holdMs } = await startAdminDemo(
    'parte 2 — profissionais, loja e permissões',
    'admin-part2'
  );

  let feeSnapshot = null;

  try {
    feeSnapshot = await snapshotAdminProfessionalTypes();
    await loginAdmin(page, adminUrl);
    await runAdminPart2Tour(page);
    await pause(page, holdMs, 'hold final parte 2');
  } finally {
    await closeAndSave();
    if (feeSnapshot) {
      try {
        await restoreAdminProfessionalTypes(feeSnapshot);
      } catch (err) {
        console.error('Falha ao restaurar taxas:', err?.message || err);
      }
    }
  }
}

main().catch((err) => {
  console.error('\nFALHA:', err?.message || err);
  process.exit(1);
});
