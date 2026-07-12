import { PATHS } from '../app/menuConfig.js';

/**
 * Default landing path after login / `/app` by role (legacy Theme redirect).
 * Priority: Produção > Acolhimento > Administrador.
 */
export function roleHomePath(roles = []) {
  const list = Array.isArray(roles) ? roles : [];
  if (list.includes('Profissional') && !list.some((r) => ['Administrador', 'Acolhimento', 'Produção'].includes(r))) {
    return PATHS.professionalServicesReport;
  }
  if (list.includes('Produção')) return PATHS.orders;
  if (list.includes('Acolhimento')) return PATHS.triage;
  if (list.includes('Administrador')) return PATHS.registration;
  return PATHS.registration;
}

export function isProfessionalOnly(roles = []) {
  const list = Array.isArray(roles) ? roles : [];
  return (
    list.includes('Profissional') &&
    !list.some((r) => ['Administrador', 'Acolhimento', 'Produção', 'Financeiro'].includes(r))
  );
}

export function hasAnyRole(roles = [], allowed = []) {
  const list = Array.isArray(roles) ? roles : [];
  return allowed.some((role) => list.includes(role));
}

export function pageTitleFromPath(pathname = '') {
  const part = pathname.split('/').filter(Boolean).pop() || '';
  const map = {
    cadastramento: 'Associados',
    servicos: 'Serviços',
    triagem: 'Triagem',
    clientesinstitucionais: 'Clientes Institucionais',
    pedidos: 'Pedidos',
    'novo-pedido': 'Novo pedido',
    produtos: 'Produtos',
    prescritores: 'Prescritores',
    profissionais: 'Profissionais',
    historico: 'Histórico do sistema',
    tags: 'Tags',
    servicos: 'Serviços',
  };
  if (pathname.includes('/relatorios/servicos') || pathname.includes('/relatorio/servicos')) {
    return 'Relatório de serviços';
  }
  return map[part] || part;
}
