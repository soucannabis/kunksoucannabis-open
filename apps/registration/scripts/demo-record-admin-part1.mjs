/**
 * Demo Admin parte 1: login + associação + banco de dados + triagem.
 *
 * Uso: npm run demo:admin:part1
 */
import { pause } from './demo-lib.mjs';
import { runAdminPart1Tour } from './demo-admin-part1-2-flows.mjs';
import {
  ensureAdminDemoFormThemeLight,
  loginAdmin,
  startAdminDemo,
} from './demo-admin-shared.mjs';

async function main() {
  await ensureAdminDemoFormThemeLight();

  const { page, closeAndSave, adminUrl, holdMs } = await startAdminDemo(
    'parte 1 — associação e triagem',
    'admin-part1'
  );

  try {
    await loginAdmin(page, adminUrl);
    await runAdminPart1Tour(page);
    await pause(page, holdMs, 'hold final parte 1');
  } finally {
    await closeAndSave();
  }
}

main().catch((err) => {
  console.error('\nFALHA:', err?.message || err);
  process.exit(1);
});
