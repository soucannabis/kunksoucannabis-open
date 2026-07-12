/** Collections shown in Dados (no file tables). Labels in Portuguese. */
export const HIDDEN_COLLECTIONS = new Set([
  'files',
  'orders_files',
  'services_files',
  'users_files',
  'users_api',
]);

export const COLLECTION_LABELS = {
  users: 'Associados',
  system_users: 'Operadores',
  orders: 'Pedidos',
  partners: 'Parceiros',
  products: 'Produtos',
  professionals: 'Profissionais',
  reception: 'Acolhimento',
  reports: 'Relatórios',
  services: 'Serviços',
  tags: 'Etiquetas',
};

export function collectionLabel(name) {
  if (COLLECTION_LABELS[name]) return COLLECTION_LABELS[name];
  if (!name) return '';
  const pretty = String(name).replace(/_/g, ' ');
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

export function isDadosCollection(name) {
  return Boolean(name) && !HIDDEN_COLLECTIONS.has(name);
}
