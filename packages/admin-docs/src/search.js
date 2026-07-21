/**
 * Busca local nos artigos (título, keywords e corpo).
 * @param {Array<{ id: string, title: string, searchText: string, section: string, slug: string }>} articles
 * @param {string} query
 */
export function searchArticles(articles, query) {
  const q = String(query || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  if (!q) return articles;
  const terms = q.split(/\s+/).filter(Boolean);
  return articles.filter((a) => terms.every((t) => a.searchText.includes(t)));
}
