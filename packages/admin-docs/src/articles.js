import { parseFrontmatter } from './parseFrontmatter.js';
import { DOC_SECTIONS } from './meta.js';

import inicio from '../content/inicio.md?raw';
import associacao from '../content/associacao.md?raw';
import cadastro from '../content/cadastro.md?raw';
import triagemFormulario from '../content/triagem-formulario.md?raw';
import triagemStatus from '../content/triagem-status.md?raw';
import triagemModulos from '../content/triagem-modulos.md?raw';
import dadosRegistros from '../content/dados-registros.md?raw';
import dadosArquivos from '../content/dados-arquivos.md?raw';
import configuracoesVariaveis from '../content/configuracoes-variaveis.md?raw';
import configuracoesArmazenamento from '../content/configuracoes-armazenamento.md?raw';
import configuracoesCache from '../content/configuracoes-cache.md?raw';
import configuracoesAparencia from '../content/configuracoes-aparencia.md?raw';
import kunkProfissionais from '../content/kunk-profissionais.md?raw';
import kunkPermissoes from '../content/kunk-permissoes.md?raw';
import kunkCiap2 from '../content/kunk-ciap2.md?raw';
import lojaStatus from '../content/loja-status.md?raw';
import webmasterUsuarios from '../content/webmaster-usuarios.md?raw';
import webmasterCredenciaisSuporte from '../content/webmaster-credenciais-suporte.md?raw';
import webmasterErros from '../content/webmaster-erros.md?raw';
import webmasterWebVitals from '../content/webmaster-web-vitals.md?raw';
import servicosIndex from '../content/servicos-externos/_index.md?raw';
import servicosEnvio from '../content/servicos-externos/envio.md?raw';
import servicosLoggi from '../content/servicos-externos/loggi.md?raw';
import servicosMelhorenvio from '../content/servicos-externos/melhorenvio.md?raw';
import servicosGeoapify from '../content/servicos-externos/geoapify.md?raw';
import servicosGoogleCalendar from '../content/servicos-externos/google_calendar.md?raw';
import servicosEmail from '../content/servicos-externos/email.md?raw';
import servicosPagarme from '../content/servicos-externos/pagarme.md?raw';
import servicosSoucannabis from '../content/servicos-externos/soucannabis_orders.md?raw';
import servicosUtalk from '../content/servicos-externos/utalk.md?raw';

/** slug na URL /inicio/:slug */
const SLUG_BY_ID = {
  inicio: '',
  associacao: 'associacao',
  cadastro: 'cadastro',
  'triagem-formulario': 'triagem',
  'triagem-status': 'triagem-status',
  'triagem-modulos': 'triagem-modulos',
  'dados-registros': 'dados',
  'dados-arquivos': 'arquivos',
  'configuracoes-variaveis': 'configuracoes',
  'configuracoes-armazenamento': 'configuracoes-armazenamento',
  'configuracoes-cache': 'configuracoes-cache',
  'configuracoes-aparencia': 'configuracoes-aparencia',
  'kunk-profissionais': 'kunk',
  'kunk-permissoes': 'kunk-permissoes',
  'kunk-ciap2': 'kunk-ciap2',
  'loja-status': 'loja',
  'webmaster-usuarios': 'webmaster',
  'webmaster-credenciais-suporte': 'webmaster-credenciais-suporte',
  'webmaster-erros': 'webmaster-erros',
  'webmaster-web-vitals': 'webmaster-web-vitals',
  'servicos-externos': 'servicos-externos',
  'servicos-envio': 'servicos-envio',
  'servicos-loggi': 'servicos-loggi',
  'servicos-melhorenvio': 'servicos-melhorenvio',
  'servicos-geoapify': 'servicos-geoapify',
  'servicos-google-calendar': 'servicos-google-calendar',
  'servicos-email': 'servicos-email',
  'servicos-pagarme': 'servicos-pagarme',
  'servicos-soucannabis': 'servicos-soucannabis',
  'servicos-utalk': 'servicos-utalk',
};

const RAW_ARTICLES = [
  inicio,
  associacao,
  cadastro,
  triagemFormulario,
  triagemStatus,
  triagemModulos,
  dadosRegistros,
  dadosArquivos,
  configuracoesVariaveis,
  configuracoesArmazenamento,
  configuracoesCache,
  configuracoesAparencia,
  kunkProfissionais,
  kunkPermissoes,
  kunkCiap2,
  lojaStatus,
  webmasterUsuarios,
  webmasterCredenciaisSuporte,
  webmasterErros,
  webmasterWebVitals,
  servicosIndex,
  servicosEnvio,
  servicosLoggi,
  servicosMelhorenvio,
  servicosGeoapify,
  servicosGoogleCalendar,
  servicosEmail,
  servicosPagarme,
  servicosSoucannabis,
  servicosUtalk,
];

function buildArticle(raw) {
  const { data, content } = parseFrontmatter(raw);
  const id = data.id || 'unknown';
  const slug = SLUG_BY_ID[id] ?? id;
  return {
    id,
    slug,
    title: data.title || id,
    section: data.section || 'inicio',
    adminPath: data.adminPath || null,
    keywords: Array.isArray(data.keywords) ? data.keywords : [],
    order: typeof data.order === 'number' ? data.order : 999,
    body: content,
    searchText: [data.title, ...(data.keywords || []), content]
      .join(' ')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, ''),
  };
}

/** @type {import('./types').DocArticle[]} */
export const articles = RAW_ARTICLES.map(buildArticle).sort((a, b) => {
  const sa = DOC_SECTIONS.findIndex((s) => s.id === a.section);
  const sb = DOC_SECTIONS.findIndex((s) => s.id === b.section);
  if (sa !== sb) return sa - sb;
  return a.order - b.order;
});

export function getArticleById(id) {
  return articles.find((a) => a.id === id) || null;
}

export function getArticleBySlug(slug) {
  const key = String(slug || '').replace(/^\/+|\/+$/g, '');
  if (!key) return getArticleById('inicio');
  return articles.find((a) => a.slug === key || a.id === key) || null;
}

export function articlesBySection() {
  const map = new Map();
  for (const section of DOC_SECTIONS) {
    map.set(section.id, []);
  }
  for (const article of articles) {
    if (!map.has(article.section)) map.set(article.section, []);
    map.get(article.section).push(article);
  }
  return map;
}

export function docsPathForSlug(slug) {
  const s = String(slug || '').replace(/^\/+|\/+$/g, '');
  return s ? `/inicio/${s}` : '/inicio';
}
