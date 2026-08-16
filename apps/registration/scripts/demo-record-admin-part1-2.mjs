/**
 * Demo Admin unificada: partes 1 + 2 num único vídeo.
 *
 * Associação/dados/triagem → profissionais/loja/permissões.
 * Restaura taxas ao finalizar.
 *
 * Uso: npm run demo:admin:part1-2
 */
import { pause } from './demo-lib.mjs';
import { runAdminPart1Tour, runAdminPart2Tour } from './demo-admin-part1-2-flows.mjs';
import {
  ensureAdminDemoFormThemeLight,
  loginAdmin,
  restoreAdminProfessionalTypes,
  snapshotAdminProfessionalTypes,
  startAdminDemo,
} from './demo-admin-shared.mjs';

async function main() {
  await ensureAdminDemoFormThemeLight();

  const { page, closeAndSave, adminUrl, holdMs } = await startAdminDemo(
    'partes 1+2 — associação, triagem, profissionais e permissões',
    'admin-part1-2'
  );

  let feeSnapshot = null;

  try {
    feeSnapshot = await snapshotAdminProfessionalTypes();
    await loginAdmin(page, adminUrl);

    await runAdminPart1Tour(page);
    await pause(page, 1_500, 'transição parte 1 → 2');

    await runAdminPart2Tour(page);
    await pause(page, holdMs, 'hold final partes 1+2');
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
