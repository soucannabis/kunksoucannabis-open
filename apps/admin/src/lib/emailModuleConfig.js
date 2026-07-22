export const EMAIL_CONFIG_PATH = '/servicos-externos/email';

/** Módulo considerado ativo quando o flag Admin está ligado. */
export function isEmailModuleActive(servicePayload) {
  if (!servicePayload || servicePayload.service !== 'email') return null;
  return Boolean(servicePayload.enabled);
}
