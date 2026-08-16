/**
 * Demo Admin unificada: partes 3 + 4 num único vídeo.
 *
 * CIAP/aparência/sistema → usuários/API/webhooks/externos.
 * Desabilita a API ao finalizar (estado limpo para regravação).
 *
 * Uso: npm run demo:admin:part3-4
 */
import { pause } from './demo-lib.mjs';
import { runAdminPart3Tour, runAdminPart4Tour } from './demo-admin-part3-4-flows.mjs';
import {
  ensureAdminDemoApiAccessDisabled,
  loginAdmin,
  restoreAdminApiAccessDisabled,
  startAdminDemo,
} from './demo-admin-shared.mjs';

async function main() {
  await ensureAdminDemoApiAccessDisabled();

  const { page, closeAndSave, adminUrl } = await startAdminDemo(
    'partes 3+4 — sistema, usuários e integrações',
    'admin-part3-4'
  );

  try {
    await loginAdmin(page, adminUrl);

    await runAdminPart3Tour(page);
    await pause(page, 1_500, 'transição parte 3 → 4');

    await runAdminPart4Tour(page);
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
