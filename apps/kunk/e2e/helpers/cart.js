import { API_URL } from './fixtures.js';

function pickCep(user) {
  if (!user || typeof user !== 'object') return null;
  const addr = user.address || user.delivery_address;
  return user.cep || user.postal_code || addr?.cep || addr?.postal_code || null;
}

/**
 * Resolve user_code de associado com endereço para abrir /novo-pedido?u=...
 * Usa a sessão autenticada do browser (admin).
 */
export async function findAssociateUserCode(page) {
  const res = await page.request.get(
    `${API_URL}/items/users?limit=80&fields=user_code,cep,postal_code,address,delivery_address`
  );
  if (res.status() !== 200) {
    throw new Error(`Listagem users falhou: HTTP ${res.status()}`);
  }
  const body = await res.json();
  const users = Array.isArray(body.data) ? body.data : [];
  const withCep = users.find((u) => u.user_code && pickCep(u));
  if (withCep?.user_code) return withCep.user_code;
  const any = users.find((u) => u.user_code);
  if (any?.user_code) return any.user_code;
  throw new Error('Nenhum associado com user_code encontrado para e2e cart');
}
