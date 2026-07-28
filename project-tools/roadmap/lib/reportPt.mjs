/**
 * Parseia saída do node:test / vitest e monta relatório detalhado em PT-BR.
 * Cada caso recebe texto específico derivado do título — sem template único.
 */

const VERB_PT = {
  build: 'monta',
  builds: 'monta',
  parse: 'interpreta',
  parses: 'interpreta',
  map: 'mapeia',
  maps: 'mapeia',
  keep: 'mantém',
  keeps: 'mantém',
  include: 'inclui',
  includes: 'inclui',
  exclude: 'exclui',
  excludes: 'exclui',
  expose: 'expõe',
  exposes: 'expõe',
  handle: 'trata',
  handles: 'trata',
  mask: 'mascara',
  masks: 'mascara',
  normalize: 'normaliza',
  normalizes: 'normaliza',
  toggle: 'alterna',
  toggles: 'alterna',
  create: 'cria',
  creates: 'cria',
  list: 'lista',
  lists: 'lista',
  limit: 'limita',
  limits: 'limita',
  fail: 'falha',
  fails: 'falha',
  work: 'funciona',
  works: 'funciona',
  mark: 'marca',
  marks: 'marca',
  omit: 'omite',
  omits: 'omite',
  require: 'exige',
  requires: 'exige',
  reject: 'rejeita',
  rejects: 'rejeita',
  return: 'retorna',
  returns: 'retorna',
  record: 'registra',
  records: 'registra',
  quote: 'cotiza',
  quotes: 'cotiza',
  accept: 'aceita',
  accepts: 'aceita',
  skip: 'ignora',
  skips: 'ignora',
  apply: 'aplica',
  applies: 'aplica',
  update: 'atualiza',
  updates: 'atualiza',
  protect: 'protege',
  protects: 'protege',
  define: 'define',
  defines: 'define',
  match: 'corresponde a',
  matches: 'corresponde a',
};

const NOUN_PT = {
  password: 'senha',
  reset: 'redefinição',
  'password reset': 'redefinição de senha',
  invite: 'convite',
  contract: 'contrato/termo',
  template: 'template',
  templates: 'templates',
  smtp: 'SMTP',
  timeout: 'tempo limite',
  blackhole: 'host inacessível (blackhole)',
  network: 'rede',
  failure: 'falha',
  failures: 'falhas',
  'rate limit': 'limite de taxa',
  login: 'login',
  logout: 'logout',
  auth: 'autenticação',
  authentication: 'autenticação',
  unauthorized: 'não autorizado',
  credentials: 'credenciais',
  credential: 'credencial',
  cookie: 'cookie de sessão',
  bearer: 'token Bearer',
  scope: 'escopo',
  scopes: 'escopos',
  token: 'token',
  tokens: 'tokens',
  webhook: 'webhook',
  webhooks: 'webhooks',
  split: 'split de pagamento',
  freight: 'frete',
  quote: 'cotação',
  quotes: 'cotações',
  storage: 'armazenamento',
  backup: 'backup',
  bucket: 'bucket',
  cache: 'cache',
  health: 'saúde do serviço',
  envelope: 'envelope de resposta',
  validation: 'validação',
  error: 'erro',
  errors: 'erros',
  complement: 'complemento',
  street: 'logradouro',
  address: 'endereço',
  confidence: 'confiança (score)',
  threshold: 'limiar',
  thresholds: 'limiares',
  features: 'resultados geográficos',
  inconsistent: 'inconsistente',
  consistent: 'consistente',
  high: 'alta',
  low: 'baixa',
  below: 'abaixo de',
  relaxed: 'relaxada',
  divergente: 'divergente',
  host: 'host',
  port: 'porta',
  secure: 'TLS/seguro',
  status: 'status',
  module: 'módulo',
  modules: 'módulos',
  provider: 'provedor',
  providers: 'provedores',
  package: 'pacote',
  store: 'loja',
  config: 'configuração',
  incomplete: 'incompleta',
  success: 'sucesso',
  event: 'evento',
  summary: 'resumo',
  rows: 'linhas',
  sample: 'amostra',
  samples: 'amostras',
  hash: 'hash',
  public: 'público',
  finite: 'finito',
  hits: 'ocorrências',
  secrets: 'segredos',
  sensitive: 'sensíveis',
  values: 'valores',
  'non-admin': 'usuário não-admin',
  order: 'pedido',
  orders: 'pedidos',
  product: 'produto',
  products: 'produtos',
  user: 'usuário',
  users: 'usuários',
  admin: 'administrador',
  operator: 'operador',
  payload: 'payload',
  delta: 'delta de alteração',
  tracking: 'rastreio',
  field: 'campo',
  fields: 'campos',
  filter: 'filtro',
  filters: 'filtros',
  query: 'consulta',
  period: 'período',
  menu: 'menu',
  route: 'rota',
  routes: 'rotas',
  role: 'perfil',
  roles: 'perfis',
  path: 'caminho',
  paths: 'caminhos',
  title: 'título',
  titles: 'títulos',
  filename: 'nome de arquivo',
  prefix: 'prefixo',
  prefixes: 'prefixos',
  csv: 'CSV',
  json: 'JSON',
  delimiter: 'delimitador',
  headers: 'cabeçalhos',
  amount: 'quantidade',
  defaults: 'valores padrão',
  default: 'padrão',
  custom: 'personalizado',
  statuses: 'status',
  collection: 'coleção',
  collections: 'coleções',
  paginated: 'paginada',
  list: 'lista',
  conflict: 'conflito',
  disabled: 'desabilitado',
  enabled: 'habilitado',
  off: 'desligado',
  on: 'ligado',
  empty: 'vazio',
  missing: 'ausente',
  found: 'encontrado',
  unknown: 'desconhecido',
  invalid: 'inválido',
  valid: 'válido',
  válido: 'válido',
  inválido: 'inválido',
  revisar: 'revisar',
  cep: 'CEP',
  viacep: 'ViaCEP',
  geoapify: 'Geoapify',
};

const DOMAIN_CONTEXT = [
  [/geoapify|viacep|endereço|address|cep|street|complement|logradouro/i, {
    area: 'validação e composição de endereço (Geoapify / ViaCEP)',
    why: 'O objetivo é classificar o endereço como válido, revisar ou inválido, cruzando CEP, logradouro e consistência entre as fontes.',
  }],
  [/smtp|email|template|blackhole|password reset|invite|e-mail/i, {
    area: 'envio de e-mail (templates + SMTP)',
    why: 'O objetivo é garantir textos de mensagem corretos, normalização SMTP e falha controlada em timeout/rede.',
  }],
  [/login|logout|cookie|bearer|token|auth|unauthorized|credentials|sessão/i, {
    area: 'autenticação e sessão',
    why:
      'A suíte cobre login COM credenciais válidas, cookie/Bearer, tokens de API e também cenários de BLOQUEIO quando falta autenticação ou o escopo é inválido. Nenhum caso desta área permite entrar sem credenciais.',
  }],
  [/cache/i, {
    area: 'cache administrativo',
    why: 'O objetivo é consultar status, ligar/desligar e limpar o cache com segurança.',
  }],
  [/storage|backup|bucket|gcs|\bs3\b/i, {
    area: 'armazenamento de arquivos / backup',
    why: 'O objetivo é validar configuração de storage e rotinas de backup do Admin.',
  }],
  [/freight|frete|quote|loggi|melhor\s*envio/i, {
    area: 'cotação de frete',
    why: 'O objetivo é cobrir provedores, configuração incompleta e bloqueio quando o módulo está off.',
  }],
  [/pagarme|webhook|split/i, {
    area: 'pagamentos Pagar.me',
    why: 'O objetivo é validar webhooks, setup e regras de split.',
  }],
  [/soucannabis|pedido|\border/i, {
    area: 'pedidos / integração SouCannabis',
    why: 'O objetivo é mapear payloads e sincronizar campos entre o sistema local e o remoto.',
  }],
  [/ciap|module|disabled|503/i, {
    area: 'módulos externos e feature flags',
    why: 'O objetivo é respeitar flags do Admin e responder 503 quando o módulo está desligado.',
  }],
  [/rbac|role|permiss|menu|route|shell/i, {
    area: 'menu, rotas e permissões',
    why: 'O objetivo é manter navegação e RBAC alinhados ao produto.',
  }],
  [/health|system-errors|web.?vital/i, {
    area: 'observabilidade / saúde',
    why: 'O objetivo é monitorar saúde da API, erros do sistema e métricas.',
  }],
  [/filter|query|sanitize|payload|import|csv/i, {
    area: 'entrada de dados e consultas',
    why: 'O objetivo é rejeitar payload inválido e montar filtros/consultas corretos.',
  }],
  [/analytics|dashboard|period|kpi/i, {
    area: 'analytics / dashboard',
    why: 'O objetivo é validar períodos, agregações e formatação de indicadores.',
  }],
  [/doc.?sign|termo|assinatur|contract/i, {
    area: 'doc-sign / termos',
    why: 'O objetivo é cobrir modelos, assinatura e auditoria de termos.',
  }],
];

function cleanSpaces(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

function splitCamel(token) {
  return String(token || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}

function expandTitle(title) {
  // não quebrar paths (/admin/cache) nem códigos
  return String(title || '')
    .split(/(\s+)/)
    .map((chunk) => {
      if (/^\s+$/.test(chunk)) return chunk;
      if (chunk.startsWith('/') || /^[A-Z][A-Z0-9_]+$/.test(chunk)) return chunk;
      if (/[a-z][A-Z]/.test(chunk) || /^[A-Z]?[a-z]+[A-Z]/.test(chunk)) return splitCamel(chunk);
      return chunk;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function translatePhrase(text) {
  let out = String(text || '').trim();
  // frases compostas primeiro
  out = out.replace(/\bpassword\s+reset\b/gi, 'redefinição de senha');
  out = out.replace(/\bredefinição de senha\s+template\b/gi, 'template de redefinição de senha');
  out = out.replace(/\b(invite|convite)\s+and\s+(contract|contrato\/termo)\s+templates?\b/gi, 'templates de convite e contrato/termo');
  out = out.replace(/\b(invite|convite)\s+e\s+(contract|contrato\/termo)\s+templates?\b/gi, 'templates de convite e contrato/termo');
  out = out.replace(/\btemplate de redefinição de senha\b/gi, 'template de redefinição de senha');
  out = out.replace(/\bredefinição de senha template\b/gi, 'template de redefinição de senha');
  out = out.replace(/\brate\s+limit\b/gi, 'limite de taxa');
  out = out.replace(/\bnon-admin\b/gi, 'usuário não-admin');
  out = out.replace(/\bcep not found\b/gi, 'CEP não encontrado nos Correios');
  out = out.replace(/\bnot found\b/gi, 'não encontrado');
  out = out.replace(/\bno features\b/gi, 'sem resultados geográficos');
  out = out.replace(/\bstreet below thresholds\b/gi, 'logradouro abaixo dos limiares de confiança');
  out = out.replace(/\bstreet confidence high\b/gi, 'confiança alta no logradouro');
  out = out.replace(/\brelaxed street\b/gi, 'critério relaxado de logradouro');
  out = out.replace(/\bViaCEP consistent\b/gi, 'ViaCEP consistente');
  out = out.replace(/\bViaCEP inconsistent\b/gi, 'ViaCEP inconsistente');
  out = out.replace(/\bGeoapify ok\b/gi, 'Geoapify ok');
  out = out.replace(/\bblackhole host\b/gi, 'host inacessível (blackhole)');
  out = out.replace(/\binvalid token scopes\b/gi, 'escopos de token inválidos');
  out = out.replace(/\binvalid credentials\b/gi, 'credenciais inválidas');
  out = out.replace(/\bvalidation error\b/gi, 'erro de validação');
  out = out.replace(/\bwithin\s+timeout\b/gi, 'dentro do tempo limite');
  out = out.replace(/\bagainst\s+(?:a\s+)?/gi, 'contra ');
  out = out.replace(/\bdivergente\s+street\b/gi, 'logradouro como divergente');
  out = out.replace(/\bdivergente\s+logradouro\b/gi, 'logradouro como divergente');
  out = out.replace(/\band\b/gi, 'e');
  out = out.replace(/\bor\b/gi, 'ou');
  out = out.replace(/\bwhen\b/gi, 'quando');
  out = out.replace(/\bwith\b/gi, 'com');
  out = out.replace(/\bwithout\b/gi, 'sem');
  out = out.replace(/\bfrom\b/gi, 'a partir de');
  out = out.replace(/\bfor\b/gi, 'para');
  out = out.replace(/\bafter\b/gi, 'após');
  out = out.replace(/\bbefore\b/gi, 'antes');
  out = out.replace(/\binto\b/gi, 'em');
  out = out.replace(/\bwithin\b/gi, 'dentro de');

  const parts = out.split(/\s+/);
  const translated = parts.map((p) => {
    const key = p.toLowerCase();
    if (NOUN_PT[key]) return NOUN_PT[key];
    if (VERB_PT[key]) return VERB_PT[key];
    if (/^\/|^\d{3}$|^[A-Z][A-Z0-9_]+$/.test(p)) return p;
    return p;
  });
  return cleanSpaces(translated.join(' '));
}

function domainFor(title, suiteDescription) {
  const hay = `${title}\n${suiteDescription || ''}`;
  for (const [re, info] of DOMAIN_CONTEXT) {
    if (re.test(hay)) return info;
  }
  return {
    area: suiteDescription || 'esta funcionalidade da API',
    why: 'O objetivo é confirmar o comportamento descrito no nome do teste.',
  };
}

function capitalize(s) {
  const t = String(s || '');
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

/**
 * Converte o título do teste em narrativa PT específica.
 */
function narrateTitle(title) {
  const original = String(title || '').trim();
  const expanded = expandTitle(original);
  const t = expanded;

  // Frases conhecidas (evita parser genérico quebrar títulos longos em inglês)
  const PHRASES = [
    [
      /^login success sets cookie and returns user without secrets$/i,
      {
        action: 'Faz login COM credenciais válidas de administrador',
        expect:
          'e confirma cookie de sessão + usuário na resposta, sem expor senha nem session_token.',
        detail:
          'Não é login anônimo: o teste envia e-mail/senha válidos (ensureAdminUser) em POST /api/v1/auth/login.',
      },
    ],
    [
      /^login validation error$/i,
      {
        action: 'Tenta login com payload vazio/inválido',
        expect: 'e espera erro de validação (HTTP 400).',
        detail: 'Garante que a API rejeita requisição malformada — não autentica ninguém.',
      },
    ],
    [
      /^login invalid credentials$/i,
      {
        action: 'Tenta login com senha errada',
        expect: 'e espera HTTP 401 INVALID_CREDENTIALS.',
        detail: 'Confirma que credenciais incorretas NÃO abrem sessão.',
      },
    ],
    [
      /^me with cookie$/i,
      {
        action: 'Chama GET /api/v1/auth/me já autenticado (cookie)',
        expect: 'e recebe o usuário da sessão.',
        detail: 'Valida que o cookie de sessão é aceito nas rotas protegidas.',
      },
    ],
    [
      /^me unauthorized without auth$/i,
      {
        action: 'Chama GET /api/v1/auth/me SEM cookie/token',
        expect: 'e espera HTTP 401 (acesso bloqueado).',
        detail:
          'Este caso prova o bloqueio quando NÃO há autenticação — o oposto de “login sem credenciais”.',
      },
    ],
    [
      /^tokens blocked when API disabled$/i,
      {
        action: 'Com acesso à API desligado no Admin',
        expect: 'operações de tokens retornam 403 API_DISABLED.',
        detail: 'Feature flag de users_api impede criar/listar tokens.',
      },
    ],
    [
      /^tokens CRUD when API enabled$/i,
      {
        action: 'Com acesso à API ligado',
        expect: 'permite criar/listar/revogar tokens de API.',
        detail: 'CRUD de tokens para integração Bearer.',
      },
    ],
    [
      /^rejects invalid token scopes$/i,
      {
        action: 'Tenta criar token com escopos inválidos',
        expect: 'e a API rejeita a criação.',
        detail: 'Escopos fora do contrato não são aceitos.',
      },
    ],
    [
      /^bearer auth works when API enabled$/i,
      {
        action: 'Autentica com Authorization Bearer (API ligada)',
        expect: 'e acessa recursos permitidos pelo escopo.',
        detail: 'Login via token de API, não via cookie de operador.',
      },
    ],
    [
      /^bearer auth rejected when API disabled$/i,
      {
        action: 'Tenta Bearer com API desligada',
        expect: 'e o acesso é rejeitado.',
        detail: 'Mesmo com token, a flag Admin desliga o acesso pela API.',
      },
    ],
    [
      /^scoped bearer respects hasScope on items$/i,
      {
        action: 'Usa Bearer com escopo limitado em /items',
        expect: 'e só permite o que o escopo autoriza.',
        detail: 'Verifica hasScope na listagem/escrita de coleções.',
      },
    ],
    [
      /^cookie \+ bearer conflict$/i,
      {
        action: 'Envia cookie e Bearer ao mesmo tempo',
        expect: 'e trata o conflito conforme a regra da API.',
        detail: 'Evita ambiguidade de identidade na mesma requisição.',
      },
    ],
    [
      /^logout$/i,
      {
        action: 'Encerra a sessão do operador (logout)',
        expect: 'e invalida o cookie para chamadas seguintes.',
        detail: 'Após logout, /auth/me deve falhar sem novo login.',
      },
    ],
  ];
  for (const [re, narr] of PHRASES) {
    if (re.test(original)) return narr;
  }

  // Verbos “seguros” para sujeito = identificador único (função)
  const FN_VERB_RE =
    'omits?|handles?|marks?|builds?|parses?|maps?|keeps?|includes?|excludes?|exposes?|rejects?|requires?|normalizes?|toggles?|limits?|accepts?|quotes?|records?|creates?|lists?|applies?|updates?|protects?|defines?|matches?';
  // NÃO incluir returns/works/fails aqui — quebram frases em inglês (“… and returns user …”)

  let m = original.match(new RegExp(`^([A-Za-z][\\w]*)\\s+(${FN_VERB_RE})\\s+(.+)$`, 'i'));
  if (m) {
    const subject = m[1];
    const verb = VERB_PT[m[2].toLowerCase()] || m[2];
    const object = translatePhrase(expandTitle(m[3]));
    return {
      action: `Avalia a função/rotina \`${subject}\``,
      expect: `e confirma que ela ${verb} ${object}.`,
      detail: `O caso isola a unidade \`${subject}\` e a asserção principal (“${verb} ${object}”).`,
    };
  }

  m = original.match(/^(GET|POST|PATCH|PUT|DELETE)\s+(\S+)\s+(?:returns?|retorna)\s+(.+)$/i);
  if (m) {
    const what = translatePhrase(m[3]);
    const expect = /^(status|envelope|lista|coleções|resumo)/i.test(what)
      ? `e verifica se a resposta traz ${what}.`
      : `e verifica se a resposta ${what}.`;
    return {
      action: `Chama o endpoint ${m[1].toUpperCase()} ${m[2]}`,
      expect,
      detail: `Dispara a requisição HTTP, inspeciona status/corpo e confirma o contrato de ${m[2]}.`,
    };
  }

  m = original.match(/^(GET|POST|PATCH|PUT|DELETE)\s+(\S+)\s+(?:is|é)\s+(.+)$/i);
  if (m) {
    return {
      action: `Chama ${m[1].toUpperCase()} ${m[2]}`,
      expect: `e confirma que ${translatePhrase(m[3])}.`,
      detail: 'Cobre visibilidade/autorização desse endpoint (ex.: público, admin-only).',
    };
  }

  m = original.match(/^(GET|POST|PATCH|PUT|DELETE)\s+(\S+)\s+(.+)$/i);
  if (m) {
    return {
      action: `Exercita ${m[1].toUpperCase()} ${m[2]} no cenário “${translatePhrase(m[3])}”`,
      expect: 'e valida status, corpo e efeitos colaterais da operação.',
      detail: 'É um teste de contrato HTTP da API Admin/Kunk.',
    };
  }

  m = t.match(/^returns?\s+(\d{3}|[A-Z][A-Z0-9_]+)\s+(?:for|when|quando)\s+(.+)$/i);
  if (m) {
    return {
      action: `Provoca a condição “${translatePhrase(m[2])}”`,
      expect: `e exige o retorno ${m[1]}.`,
      detail: 'Garante código/erro correto para o cliente quando a pré-condição ocorre.',
    };
  }

  // when / with / against antes de verb-first genérico
  m = original.match(/^(.+?)\s+when\s+(.+)$/i);
  if (m) {
    return {
      action: `No cenário em que ${translatePhrase(expandTitle(m[2]))}`,
      expect: `o resultado esperado é “${translatePhrase(expandTitle(m[1]))}”.`,
      detail: 'Cobre um ramo condicional (pré-condição → classificação/resultado).',
    };
  }

  m = original.match(/^(.+?)\s+with\s+(.+)$/i);
  if (m) {
    return {
      action: `Executa “${translatePhrase(expandTitle(m[1]))}”`,
      expect: `usando ${translatePhrase(expandTitle(m[2]))}.`,
      detail: 'Valida a combinação de parâmetros indicada no título.',
    };
  }

  m = original.match(/^(.+?)\s+against\s+(.+)$/i);
  if (m) {
    return {
      action: `Executa ${translatePhrase(expandTitle(m[1]))}`,
      expect: `em comparação/integração com ${translatePhrase(expandTitle(m[2]))}.`,
      detail: 'Pode usar stub local ou chamada externa, conforme a suíte.',
    };
  }

  const VERB_FIRST =
    'builds?|parses?|maps?|keeps?|includes?|excludes?|exposes?|handles?|masks?|normalizes?|toggles?|creates?|lists?|limits?|fails?|works?|marks?|omits?|requires?|rejects?|returns?|quotes?|records?|accepts?|applies?|updates?|protects?|defines?|matches?';
  m = original.match(new RegExp(`^(${VERB_FIRST})\\s+(.+)$`, 'i'));
  if (m) {
    const verb = VERB_PT[m[1].toLowerCase()] || m[1];
    const object = translatePhrase(expandTitle(m[2]));
    let special = '';
    if (/within\s+timeout|blackhole/i.test(m[2])) {
      special = ' Inclui timeout/rede para evitar hang (ex.: SMTP contra host inacessível).';
    } else if (/password\s+reset|invite|contract|template/i.test(m[2])) {
      special = ' Verifica assunto/corpo ou estrutura do template gerado.';
    }
    return {
      action: `Verifica se o código ${verb} ${object}`,
      expect: 'de acordo com a regra implementada no módulo.',
      detail: `Caso unitário/integração focado nessa transformação ou efeito.${special}`,
    };
  }

  // Fallback sujeito+verbo só se o sujeito for um único identificador
  m = t.match(new RegExp(`^([A-Za-z][\\w]*)\\s+(${FN_VERB_RE})\\s+(.+)$`, 'i'));
  if (m) {
    const verb = VERB_PT[m[2].toLowerCase()] || m[2];
    const object = translatePhrase(m[3]);
    return {
      action: `Avalia a rotina “${m[1]}”`,
      expect: `e confirma que ela ${verb} ${object}.`,
      detail: `O título “${original}” define a unidade e a asserção (${verb} ${object}).`,
    };
  }

  if (/[áàâãéêíóôõúç]|mapeia|atualiza|protege|aplica|valida|retorna|exige|omite/i.test(original)) {
    return {
      action: `Segue a especificação do próprio título: “${original}”`,
      expect: 'e confere o resultado funcional descrito nele.',
      detail: 'O nome do teste já está em português e funciona como critério de aceite.',
    };
  }

  const translated = translatePhrase(t);
  return {
    action: `Executa o cenário “${original}”`,
    expect:
      translated && translated.toLowerCase() !== original.toLowerCase()
        ? `(leitura: ${translated}).`
        : 'e verifica a asserção principal desse cenário.',
    detail: 'A narrativa foi montada a partir do nome do teste reportado pelo runner.',
  };
}

function describeCase(title, status, errorText, suiteDescription, meta = {}) {
  const domain = domainFor(title, suiteDescription);
  const narr = narrateTitle(title);
  const suite = String(suiteDescription || '').replace(/\.+$/, '');
  const files =
    Array.isArray(meta.files) && meta.files.length
      ? `Arquivos exercitados: ${meta.files.join(', ')}.`
      : '';
  const duration =
    meta.durationMs != null && Number.isFinite(meta.durationMs)
      ? `Duração observada: ${Math.round(meta.durationMs)} ms.`
      : '';

  const descriptionPt = cleanSpaces(
    [
      `Contexto da suíte: ${suite}.`,
      `Domínio: ${domain.area}.`,
      `${capitalize(narr.action)} ${narr.expect}`,
      narr.detail,
      domain.why,
      files,
    ]
      .filter(Boolean)
      .join(' '),
  );

  if (status === 'pass') {
    return {
      descriptionPt,
      resultPt: cleanSpaces(
        `Resultado: PASSOU. A asserção de “${title}” foi atendida. ` +
          `${capitalize(narr.action)} ${narr.expect} ` +
          `Isso reforça a confiança no domínio de ${domain.area}. ${duration}`,
      ),
    };
  }

  if (status === 'skip' || status === 'todo') {
    return {
      descriptionPt,
      resultPt: cleanSpaces(
        `Resultado: IGNORADO. O runner não executou “${title}” nesta passagem (skip/todo). ` +
          `O cenário permanece documentado, porém sem verificação efetiva. ${duration}`,
      ),
    };
  }

  const err = String(errorText || '').trim();
  const shortErr = err
    ? err.split('\n').slice(0, 6).join(' ').replace(/\s+/g, ' ').slice(0, 520)
    : 'sem mensagem detalhada do assert';

  return {
    descriptionPt,
    resultPt: cleanSpaces(
      `Resultado: FALHOU. O caso “${title}” não cumpriu a expectativa. ` +
        `Esperado: ${narr.action} ${narr.expect} ` +
        `Mensagem do runner: ${shortErr}. ${duration}`,
    ),
  };
}

function parseSpecOutput(text) {
  const cases = [];
  const lines = String(text || '').split(/\r?\n/);
  let pendingFail = null;
  let pendingIo = [];

  for (const line of lines) {
    const ioMatch = line.match(/^__KUNK_IO__(.+)$/);
    if (ioMatch) {
      try {
        pendingIo.push(JSON.parse(ioMatch[1]));
      } catch {
        /* ignore */
      }
      continue;
    }

    const pass = line.match(/^\s*[✔✓]\s+(.+?)\s*(?:\(([\d.]+)m?s\))?\s*$/);
    const fail = line.match(/^\s*[✖×x]\s+(.+?)\s*(?:\(([\d.]+)m?s\))?\s*$/i);
    const skip = line.match(/^\s*[﹣-]\s+(.+?)\s*(?:\(([\d.]+)m?s\))?\s*$/);

    if (pass) {
      cases.push({
        title: pass[1].trim(),
        status: 'pass',
        durationMs: pass[2] ? Number(pass[2]) : null,
        error: '',
        io: pendingIo,
      });
      pendingIo = [];
      pendingFail = null;
      continue;
    }
    if (fail) {
      pendingFail = {
        title: fail[1].trim(),
        status: 'fail',
        durationMs: fail[2] ? Number(fail[2]) : null,
        error: '',
        io: pendingIo,
      };
      pendingIo = [];
      cases.push(pendingFail);
      continue;
    }
    if (skip) {
      cases.push({
        title: skip[1].trim(),
        status: 'skip',
        durationMs: skip[2] ? Number(skip[2]) : null,
        error: '',
        io: pendingIo,
      });
      pendingIo = [];
      pendingFail = null;
      continue;
    }
    if (pendingFail && /^\s+/.test(line) && line.trim() && !line.startsWith('__KUNK_IO__')) {
      pendingFail.error += `${line.trim()}\n`;
    }
  }
  return cases;
}

function formatIoSummaryPt(ioList) {
  if (!Array.isArray(ioList) || !ioList.length) {
    return 'Sem captura HTTP neste caso (unitário puro, ou nenhuma chamada via Supertest).';
  }
  return ioList
    .map((io, i) => {
      const n = ioList.length > 1 ? ` #${i + 1}` : '';
      const route = `${io.method || '?'} ${io.route || '?'}`;
      const st = io.status != null ? ` → HTTP ${io.status}` : '';
      return `Chamada${n}: ${route}${st}.`;
    })
    .join(' ');
}

function parseTapOutput(text) {
  const cases = [];
  const lines = String(text || '').split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    const ok = line.match(/^ok\s+\d+\s+[#-]*\s*(.+)$/i);
    const notOk = line.match(/^not ok\s+\d+\s+[#-]*\s*(.+)$/i);
    if (ok) {
      current = { title: ok[1].trim(), status: 'pass', durationMs: null, error: '' };
      cases.push(current);
      continue;
    }
    if (notOk) {
      current = { title: notOk[1].trim(), status: 'fail', durationMs: null, error: '' };
      cases.push(current);
      continue;
    }
    if (current && current.status === 'fail' && line.startsWith('#')) {
      current.error += `${line.replace(/^#\s?/, '')}\n`;
    }
  }
  return cases;
}

function parseSummary(text) {
  const t = String(text || '');
  const pass = Number((t.match(/ℹ?\s*pass\s+(\d+)/i) || t.match(/(\d+)\s+passed/i) || [])[1] || 0);
  const fail = Number((t.match(/ℹ?\s*fail\s+(\d+)/i) || t.match(/(\d+)\s+failed/i) || [])[1] || 0);
  const skipped = Number((t.match(/ℹ?\s*skipped\s+(\d+)/i) || [])[1] || 0);
  const tests = Number((t.match(/ℹ?\s*tests\s+(\d+)/i) || [])[1] || pass + fail + skipped);
  const durationMs = Number((t.match(/duration_ms\s+([\d.]+)/i) || t.match(/Duration\s+([\d.]+)/i) || [])[1] || 0);
  return { tests, pass, fail, skipped, durationMs };
}

function highlightCases(casesPt) {
  if (!casesPt.length) return '';
  const fails = casesPt.filter((c) => c.status === 'fail');
  if (fails.length) {
    return (
      ` Casos em falha (até 3): ${fails
        .slice(0, 3)
        .map((c) => `“${c.title}”`)
        .join('; ')}.`
    );
  }
  const sample = casesPt
    .slice(0, 3)
    .map((c) => `“${c.title}”`)
    .join('; ');
  return ` Exemplos de casos cobertos: ${sample}${casesPt.length > 3 ? '; …' : ''}.`;
}

function buildPortugueseReport({ entry, exitCode, stdout, stderr, timedOut, startedAt, finishedAt }) {
  const combined = `${stdout}\n${stderr}`;
  let cases = parseSpecOutput(combined);
  if (!cases.length) cases = parseTapOutput(combined);
  const summary = parseSummary(combined);
  if (!summary.tests && cases.length) {
    summary.tests = cases.length;
    summary.pass = cases.filter((c) => c.status === 'pass').length;
    summary.fail = cases.filter((c) => c.status === 'fail').length;
    summary.skipped = cases.filter((c) => c.status === 'skip').length;
  }

  const suiteDescription =
    entry.description ||
    entry.label ||
    `Suíte ${entry.id}`;

  // describe() às vezes aparece como ✔ no final — remove se for só o nome do bloco
  const itTitles = new Set(cases.map((c) => c.title));
  const filtered = cases.filter((c) => {
    if (c.io && c.io.length) return true;
    // mantém testes reais de uma palavra (logout); remove se for o único "pai" sem IO e
    // todos os outros títulos são mais longos e o nome bate com describe genérico
    if (/^(auth|email|cache|storage|health)$/i.test(c.title) && cases.length > 1) return false;
    return itTitles.has(c.title);
  });

  const casesPt = filtered.map((c) => {
    const io = Array.isArray(c.io) ? c.io : [];
    const d = describeCase(c.title, c.status, c.error, suiteDescription, {
      files: entry.files,
      durationMs: c.durationMs,
    });
    return {
      title: c.title,
      status: c.status,
      durationMs: c.durationMs,
      descriptionPt: d.descriptionPt,
      resultPt: d.resultPt,
      error: (c.error || '').trim(),
      io,
      ioSummaryPt: formatIoSummaryPt(io),
    };
  });

  const ok = !timedOut && exitCode === 0 && summary.fail === 0;
  const desc = String(suiteDescription).replace(/\.+$/, '');
  let summaryPt;
  if (timedOut) {
    summaryPt =
      `Tempo esgotado ao executar “${entry.label || entry.id}”. ` +
      `A suíte (“${desc}”) foi interrompida antes de concluir todos os casos. ` +
      'Isso costuma ocorrer em integração com banco/rede ou testes SMTP lentos. ' +
      'Confira DATABASE_URL e prefira unitários locais para validação rápida.';
  } else if (ok) {
    summaryPt =
      `Suíte concluída com sucesso: ${summary.pass} teste(s) passaram` +
      (summary.skipped ? `, ${summary.skipped} ignorado(s)` : '') +
      (summary.durationMs ? ` em ~${Math.round(summary.durationMs)} ms` : '') +
      `. Objetivo: ${desc}.` +
      highlightCases(casesPt) +
      ' Cada item abaixo explica o que foi verificado e por quê.';
  } else {
    summaryPt =
      `Suíte com falha: ${summary.fail || 'pelo menos 1'} teste(s) falharam` +
      (summary.pass ? ` (${summary.pass} passaram)` : '') +
      `. Objetivo: ${desc}.` +
      highlightCases(casesPt) +
      ' Leia “O que este teste faz” e “Resultado” em cada caso; o log técnico fica no final.';
  }

  if (!casesPt.length && !timedOut) {
    summaryPt +=
      ' Não foi possível listar casos individuais a partir da saída bruta; abra o log técnico.';
  }

  return {
    testId: entry.id,
    featureId: entry.featureId,
    kind: 'api',
    label: entry.label || entry.id,
    descriptionPt:
      `${desc}. Esta execução percorreu ${casesPt.length || summary.tests || 0} caso(s) ` +
      `em ${(entry.files || []).join(', ') || 'os arquivos da suíte'}, ` +
      'com explicação individual do cenário e do resultado em português.',
    cwd: entry.cwd,
    files: entry.files || [],
    command: entry._command || '',
    startedAt,
    finishedAt,
    exitCode,
    timedOut: Boolean(timedOut),
    ok,
    summary: {
      ...summary,
      summaryPt,
    },
    cases: casesPt,
    stdout: String(stdout || '').slice(-60_000),
    stderr: String(stderr || '').slice(-30_000),
  };
}

export {
  buildPortugueseReport,
  parseSpecOutput,
  parseTapOutput,
  describeCase,
  narrateTitle,
  formatIoSummaryPt,
};
