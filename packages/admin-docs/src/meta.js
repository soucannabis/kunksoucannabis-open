/** Seções da documentação do Admin (ordem do índice). */
export const DOC_SECTIONS = [
  { id: 'inicio', title: 'Visão geral' },
  { id: 'associacao', title: 'Dados da associação' },
  { id: 'cadastro', title: 'Sistema de cadastro' },
  { id: 'triagem', title: 'Triagem' },
  { id: 'dados', title: 'Dados' },
  { id: 'configuracoes', title: 'Configurações do sistema' },
  { id: 'kunk', title: 'Kunk' },
  { id: 'loja', title: 'Loja' },
  { id: 'webmaster', title: 'Webmaster' },
  { id: 'servicos-externos', title: 'Serviços externos' },
];

export function sectionTitle(sectionId) {
  return DOC_SECTIONS.find((s) => s.id === sectionId)?.title || sectionId;
}
