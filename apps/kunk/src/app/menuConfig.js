/** Staff roles allowed into the Kunk operational app. */
export const KUNK_STAFF_ROLES = ['Administrador', 'Acolhimento', 'Produção'];

/**
 * Portuguese URL paths (legacy Kunk parity).
 * File/component names stay in English.
 */
export const PATHS = {
  registration: '/app/acolhimento/cadastramento',
  services: '/app/acolhimento/servicos',
  triage: '/app/acolhimento/triagem',
  institutionalClients: '/app/acolhimento/clientesinstitucionais',
  orders: '/app/loja/pedidos',
  newOrder: '/app/loja/novo-pedido',
  products: '/app/loja/produtos',
  prescribers: '/app/prescritores',
  systemHistory: '/app/historico',
};

/**
 * Sidebar menu config (Portuguese labels + Portuguese paths).
 * Order matches the legacy Kunk sidebar (v1 filtered).
 */
export const MENU_SECTIONS = [
  {
    id: 'acolhimento',
    label: 'Acolhimento',
    items: [
      { id: 'associados', label: 'Associados', path: PATHS.registration },
      { id: 'servicos', label: 'Serviços', path: PATHS.services },
      { id: 'triagem', label: 'Triagem', path: PATHS.triage },
      { id: 'tags', label: 'Tags', action: 'tags' },
      {
        id: 'institutional-clients',
        label: 'Clientes Institucionais',
        path: PATHS.institutionalClients,
      },
    ],
  },
  {
    id: 'loja',
    label: 'Loja',
    items: [
      { id: 'pedidos', label: 'Pedidos', path: PATHS.orders },
      { id: 'produtos', label: 'Produtos', path: PATHS.products },
    ],
  },
  {
    id: 'parceirosPrescritores',
    label: 'Parceiros e Prescritores',
    items: [{ id: 'prescritores', label: 'Prescritores', path: PATHS.prescribers }],
  },
  {
    id: 'sistema',
    label: 'Sistema',
    items: [{ id: 'historico', label: 'Histórico do sistema', path: PATHS.systemHistory }],
  },
];

/** Labels that must NOT appear in the v1 sidebar. */
export const REMOVED_MENU_LABELS = [
  'Dashboard',
  'Painel geral',
  'Beeviral Analytics',
  'Webmaster',
  'Nibo Dashboard',
  'Pesquisas de Satisfação',
  'Matérias primas',
  'Serviço Social',
  'Cupons',
  'Relatórios',
  'Pagamentos',
  'Sou Analytics',
  'Dashboards',
  'Parceiros',
  'Usuários',
  'Usuários do sistema',
];

export function flattenMenuItems(sections = MENU_SECTIONS) {
  return sections.flatMap((section) => section.items);
}

export function getNavigablePaths(sections = MENU_SECTIONS, { isAdmin = true } = {}) {
  return flattenMenuItems(sections)
    .filter((item) => item.path && (!item.adminOnly || isAdmin))
    .map((item) => item.path);
}
