/**
 * Demo Admin parte 4: usuários, credenciais, API, webhooks e serviços externos.
 *
 * Uso: npm run demo:admin:part4
 */
import { pause } from './demo-lib.mjs';
import { runAdminPart4Tour } from './demo-admin-part3-4-flows.mjs';
import {
  ensureAdminDemoApiAccessDisabled,
  loginAdmin,
  restoreAdminApiAccessDisabled,
  startAdminDemo,
} from './demo-admin-shared.mjs';

async function main() {
  await ensureAdminDemoApiAccessDisabled();

  const { page, closeAndSave, adminUrl, holdMs } = await startAdminDemo(
    'parte 4 — usuários e integrações',
    'admin-part4'
  );

  const finalHold = Number(process.env.DEMO_HOLD_MS || Math.max(holdMs, 12_000));

  try {
    await loginAdmin(page, adminUrl);
    await runAdminPart4Tour(page);
    await pause(page, finalHold, 'hold final parte 4');
  } finally {
    await closeAndSave();
    try {
      await restoreAdminApiAccessDisabled();
    } catch (err) {
      console.error('Falha ao desabilitar API:', err?.message || err);
    }
  }
}

main().catch((err) => {
  console.error('\nFALHA:', err?.message || err);
  process.exit(1);
});
