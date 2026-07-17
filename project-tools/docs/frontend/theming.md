# Theming e branding por associação

> Como os frontends se adaptam a cada associação sem fork de código.
> Usado por cadastramento, admin, painel, kunk e termos.

## Objetivo

Cada instância (self-hosted ou SaaS) configura identidade visual e textos via **`system_configs`** (cascata DB → env local → hardcoded) e, para URLs de bootstrap, via **variáveis de ambiente de build** — não via hardcode no código de produto.

## Cascata de resolução (kunk-api)

Prioridade ao resolver uma key de `system_configs`:

1. Valor preenchido na tabela `system_configs` (sensíveis: AES-256-GCM com `CONFIG_ENCRYPT_KEY`)
2. Env local (`process.env[key]`)
3. `hardcoded_default` se `allow_hardcoded`
4. Vazio — se `is_required`, a API inclui o erro em `errors`

Endpoints públicos:

- `GET /api/v1/config/public?system=registration` — branding do cadastramento
- `GET /api/v1/config/public?system=kunk` — aparência do app operacional

Só keys não sensíveis. O endpoint devolve valores com source `db` ou `env`; defaults hardcoded ficam no cliente (`@kunk/config`).

O cadastramento (`apps/registration`) e o Kunk (`apps/kunk`) usam Vite só para bootstrap (`VITE_API_URL`, `VITE_URL`) e buscam branding nesses endpoints no boot.

## Tokens mínimos

### Bootstrap (só env de build — **não** vão para `system_configs`)

| Token / env | Uso | Exemplo |
|---|---|---|
| `VITE_URL` | URL pública do app | `https://cad.…` / `https://kunk.…` |
| `VITE_API_URL` | Base da kunk-api (dev: `/api/v1` via proxy Vite) | `/api/v1` ou `https://api.…/api/v1` |

### Branding (seed em `system_configs` com `system = registration`)

| Token / env | Uso | Exemplo legado |
|---|---|---|
| `VITE_ASSOCIATION_NAME` | Nome exibido | `Sou Cannabis` |
| `VITE_ASSOCIATION_LOGO` | Logo login / welcome | URL ou path |
| `VITE_ASSOCIATION_LOGO_MENU` | Logo navbar | URL ou path |
| `VITE_ASSOCIATION_LOGO_SIZE` | Tamanho do logo | `180px` |
| `VITE_WELCOME_TEXT` | Subtítulo da boas-vindas | texto livre |
| `VITE_CONTACT_URL` | CTA “Solicitar contato” / agendar | URL externa |

Cores do cadastramento (CSS variables em `@kunk/theme`):

| Variável CSS | Papel | Valor legado SouCannabis |
|---|---|---|
| `--kunk-bg` | Fundo atmosférico | `#132712` (+ overlay) |
| `--kunk-nav` | Navbar | `#4e774d` |
| `--kunk-sidebar-from` / `to` | Gradiente sidebar | `#e5e5e5` → `#cfd6db` |
| `--kunk-input-bg` | Fundo de input | `#f0f5fa` |
| `--kunk-contact` | CTA contato | `#e3bf0d` |

### Aparência do Kunk (seed `system = kunk`)

Editável na UI dedicada do admin: **`/aparencia`**. Seed SQL: `project-tools/sql/alter-system-configs-kunk-appearance.sql`.

Helpers no pacote: `getKunkPublicConfig()` / `mergeKunkPublicConfigFromApi()` (`@kunk/config`).

| Token / env | Default | Uso |
|---|---|---|
| `VITE_KUNK_TITLE` | `Kunk SouCannabis` | Título da sidebar / document.title |
| `VITE_KUNK_LOGO` | _(vazio)_ | Logo sidebar e login (quadro 120×120px; upload no admin salva na hora → `/api/v1/files/{id}/download`, download público enquanto a config apontar para o arquivo). Sem fallback estático. |
| `VITE_KUNK_BG_MODE` | `color` | `color` (usa fundo dos temas) ou `image` |
| `VITE_KUNK_BG_IMAGE` | _(vazio)_ | URL da imagem (mode=image) |
| `VITE_KUNK_MENU_BG` | `#5a7a5b` | Fundo do menu |
| `VITE_KUNK_MENU_TEXT` | `#ffffff` | Fonte do menu |
| `VITE_KUNK_MENU_HOVER_BG` | `#ffffff` | Hover do menu |
| `VITE_KUNK_MENU_HOVER_TEXT` | `#000000` | Texto no hover |
| `VITE_KUNK_DEFAULT_THEME` | `dark` | Modo inicial sem preferência do usuário |
| `VITE_KUNK_DARK_*` | verdes/roxos atuais | Paleta tema escuro (`BG`, `PRIMARY`, `ACCENT`, `ACCENT_HOVER`) |
| `VITE_KUNK_LIGHT_*` | `#f5f5f5` + mesmos accents | Paleta tema claro |

CSS variables aplicadas em runtime pelo `KunkConfigProvider` (`apps/kunk`):

| Variável | Papel |
|---|---|
| `--kunk-app-bg` | Fundo do app (tema ativo; imagem prevalece se `bg_mode=image`) |
| `--kunk-menu-bg` / `--kunk-menu-text` | Menu lateral |
| `--kunk-menu-hover-bg` / `--kunk-menu-hover-text` | Hover do menu |
| `--kunk-primary` | Verde do tema ativo |
| `--kunk-accent` / `--kunk-accent-hover` | Roxo (títulos, QuickNav) |
| `--kunk-bg-image` | `url(...)` ou `none` |

Toggle claro/escuro: `ThemeSettings` no sidebar; preferência em `localStorage.selectedTheme` (`dark` \| `light`). Sem preferência, usa `VITE_KUNK_DEFAULT_THEME`.

## O que não vai no frontend

- Tokens de banco / Directus
- Chaves de criptografia (`CONFIG_ENCRYPT_KEY`, `VITE_PASS_ENCRYPT` no legado é risco)
- API keys de DocuSeal / e-mail

Esses ficam só no servidor (`kunk-api`). Valores sensíveis em `system_configs` são criptografados at-rest.

## Feature flags leves

Evitar `if (associationName === "Sou Cannabis")` no código (existe no legado para upload externo). Preferir:

```
VITE_FEATURE_EXTERNAL_UPLOAD_URL=https://…
```

vazio = desabilitado.
