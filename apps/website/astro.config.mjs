// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

const github = "https://github.com/soucannabis/kunksoucannabis-open";

/** @param {string} directory */
const auto = (directory) => ({ autogenerate: { directory } });

/**
 * @param {string} label
 * @param {string} directory
 * @param {boolean} [collapsed]
 */
const autoGroup = (label, directory, collapsed = true) => ({
  label,
  collapsed,
  items: [auto(directory)],
});

/** @type {import('@astrojs/starlight/types').StarlightUserConfig['sidebar']} */
const sidebar = [
  {
    label: "Introdução",
    items: [
      { label: "O que é o Kunk", slug: "introducao/o-que-e" },
      { label: "Princípios", slug: "introducao/principios" },
    ],
  },
  {
    label: "Instalação",
    items: [
      { label: "Requisitos", slug: "instalacao/requisitos" },
      { label: "Setup local", slug: "instalacao/setup-local" },
      { label: "Deploy / Docker", slug: "instalacao/deploy" },
      { label: "Deploy no Railway", slug: "instalacao/railway" },
      { label: "Mapa do repositório", slug: "introducao/mapa-repositorio" },
    ],
  },
  {
    label: "Configuração",
    items: [
      { label: "Variáveis de ambiente", slug: "configuracao/variaveis" },
      { label: "Instância e assistente", slug: "configuracao/instancia" },
      { label: "Auth e papéis", slug: "configuracao/auth-roles" },
    ],
  },
  {
    label: "Apps",
    items: [
      { label: "Visão geral", slug: "apps" },
      { label: "Estrutura frontend", slug: "frontend/structure" },
      { label: "Temas", slug: "frontend/theming" },
      autoGroup("Cadastro de Associados", "frontend/cadastramento"),
      autoGroup("Assinatura de termos", "frontend/doc-sign"),
      {
        label: "Kunk",
        collapsed: true,
        items: [
          { label: "Índice", slug: "frontend/kunk" },
          autoGroup("Páginas", "frontend/kunk/pages"),
          autoGroup("Triagem", "frontend/kunk/triagem"),
          autoGroup("Associados", "frontend/kunk/associados"),
          autoGroup("Pedidos / carrinho", "frontend/kunk/pedidos"),
          autoGroup("Listagem de pedidos", "frontend/kunk/pedidos-listagem"),
          autoGroup("Serviços", "frontend/kunk/servicos"),
          autoGroup("Relatórios de serviços", "frontend/kunk/relatorios-servicos"),
          autoGroup("Pagamentos SouCannabis", "frontend/kunk/pagamentos-soucannabis"),
          autoGroup("Busca global", "frontend/kunk/search-global"),
          autoGroup("Analytics", "frontend/kunk/analytics"),
          autoGroup("Clientes institucionais", "frontend/kunk/clientes-institucionais"),
        ],
      },
      autoGroup("Área Admin", "frontend/admin"),
    ],
  },
  {
    label: "API",
    items: [
      { label: "Visão geral", slug: "api" },
      { label: "Arquitetura", slug: "api/architecture" },
      { label: "Autenticação", slug: "api/authentication" },
      { label: "Autorização", slug: "api/authorization" },
      { label: "Rotas de domínio", slug: "api/domain-routes" },
      { label: "Items", slug: "api/items" },
      { label: "Collections", slug: "api/collections" },
      { label: "Query parameters", slug: "api/query-parameters" },
      { label: "Arquivos", slug: "api/files" },
      { label: "Storage cloud", slug: "api/files-cloud-storage" },
      { label: "Storage S3", slug: "api/storage-s3-setup" },
      { label: "Storage GCS", slug: "api/storage-gcs-setup" },
      { label: "Cache", slug: "api/cache" },
      { label: "Erros", slug: "api/errors" },
      { label: "System errors", slug: "api/system-errors" },
      { label: "Web vitals", slug: "api/web-vitals" },
      { label: "Doc-sign (API)", slug: "api/doc-sign" },
      { label: "Módulos (índice)", slug: "api/modules" },
      autoGroup("Módulos", "api/modules"),
    ],
  },
  autoGroup("Funcionalidades", "funcionalidades", true),
  {
    label: "Operação",
    items: [
      { label: "Backup e dados", slug: "operacao/backup" },
      { label: "Logs", slug: "operacao/logs" },
      { label: "Erros do sistema", slug: "operacao/erros" },
    ],
  },
  {
    label: "Contribuindo",
    items: [
      { label: "Padrões", slug: "contribuindo/padroes" },
      { label: "Roadmap", slug: "contribuindo/roadmap" },
    ],
  },
];

export default defineConfig({
  site: "https://kunk.soucannabis.org",
  devToolbar: {
    enabled: false,
  },
  vite: {
    server: {
      host: true,
      port: 4260,
      strictPort: true,
      hmr: {
        // Evita WebSocket quebrado quando o browser acessa via localhost
        // enquanto o server escuta em 0.0.0.0
        protocol: "ws",
        host: "localhost",
        port: 4260,
        clientPort: 4260,
      },
      watch: {
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "!**/src/content/docs/api/**",
          "!**/src/content/docs/frontend/**",
          "!**/src/content/docs/funcionalidades/**",
        ],
      },
    },
  },
  integrations: [
    starlight({
      title: "Kunk",
      description:
        "Sistema open source para associações de cannabis medicinal — documentação completa.",
      defaultLocale: "root",
      locales: {
        root: { label: "Português", lang: "pt-BR" },
      },
      social: [{ icon: "github", label: "GitHub", href: github }],
      favicon: "/favicon.png",
      logo: {
        src: "./src/assets/kunkLogo.png",
        alt: "Kunk",
      },
      customCss: ["./src/styles/custom.css"],
      components: {
        ThemeProvider: "./src/components/ForceLightTheme.astro",
        ThemeSelect: "./src/components/Empty.astro",
        MobileMenuFooter: "./src/components/Empty.astro",
      },
      sidebar,
      tableOfContents: false,
      pagination: true,
      lastUpdated: false,
      credits: false,
      head: [
        {
          tag: "link",
          attrs: {
            rel: "preconnect",
            href: "https://fonts.googleapis.com",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "preconnect",
            href: "https://fonts.gstatic.com",
            crossorigin: "anonymous",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "stylesheet",
            href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap",
          },
        },
      ],
    }),
  ],
});
