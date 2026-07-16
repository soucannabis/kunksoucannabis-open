# Estrutura frontend (multi-app)

> Proposta de organização do código de UI para **todas** as superfícies do Kunk
> (cadastramento, admin, painel, termos) — não apenas o cadastro.

## Princípios

1. **Um repositório de produto** — apps e pacotes no mesmo tree do OSS (o `cadastramento/` legado com `.git` próprio deixa de ser o modelo).
2. **Apps finos, pacotes gordos** — lógica de API, auth, tema e forms reutilizáveis ficam em `packages/`.
3. **Deploy por subdomínio** — cada app gera um artefato estático (ou SSR mínimo) servido em host distinto; todos apontam para a mesma API.
4. **Schema novo no cliente** — nomes de campo do schema alvo (`associate_name`, etc.), nunca os typos Directus (`emiiter_rg_associate`).
5. **Branding por env** — logo, nome, cores e URLs de contato via variáveis; o código não hardcoda SouCannabis além de defaults de exemplo.

## Árvore proposta

```
kunksoucannabis-open/
├── apps/
│   ├── registration/          # Cadastramento (cad.) — 1º frontend · :4255
│   ├── admin/                 # Admin da instância (admin.) — :4256
│   ├── panel/                 # Painel operacional (app.) — migração futura de src/
│   └── doc-sign/              # Termos/assinaturas (termos.) — :4258
├── packages/
│   ├── api-client/            # fetch tipado → kunk-api /v1
│   ├── auth-session/          # login/logout/me, UserProvider genérico
│   ├── ui/                    # inputs, alerts, layout primitives
│   ├── forms/                 # CPF, telefone, CEP, CIAP2, nationality…
│   ├── theme/                 # CSS variables + tokens por associação
│   └── config/                # schema Zod das envs públicas (VITE_*)
├── kunk-api/                  # API unificada
├── project-tools/             # docs, SQL, scripts
└── …
```

### Nomes

| Pasta | Subdomínio | Porta dev | Nome de produto |
|---|---|---|---|
| `apps/registration` | `cad.` | 4255 | Cadastramento |
| `apps/admin` | `admin.` | 4256 | Admin da instância |
| `apps/panel` | `app.` | — | Painel Kunk (operacional) |
| `apps/doc-sign` | `termos.` | 4258 | Gerenciador de termos / assinaturas |

Os nomes em inglês nas pastas evitam acentos em paths; a UI e a docs permanecem em português.

## Responsabilidade de cada pacote

### `packages/api-client`

- Base URL, `credentials: 'include'`, envelope `{ data, meta, errors }`
- Helpers tipados para `/users`, `/files`, `/auth/*`
- Sem conhecimento de rotas de página

### `packages/auth-session`

- `login` / `logout` / `me`
- Contexto React opcional (ou hook) consumido por registration, admin e panel
- Distinguir **tipo de sessão**: `associate` (`users`) vs `operator` (`system_users`) — ver gaps de API
- No admin: após `me`, gate por role `Administrador`

### `packages/ui` + `packages/forms`

- Componentes sem acoplamento a Bootstrap ou MUI do legado
- O cadastramento pode começar com Bootstrap (fidelidade visual); o painel pode manter MUI
- Forms compartilhados (CPF, telefone, CIAP2) devem ser headless ou com skin mínima

### `packages/theme`

- CSS variables: `--color-bg`, `--color-nav`, `--color-cta`, logos
- Carregadas a partir de `packages/config` / env da associação
- Ver [theming.md](./theming.md)

### `packages/config`

- Lista canônica de `VITE_*` públicas
- **Proibido** embutir tokens de Directus, API keys ou chaves de criptografia no bundle (dívida do legado)

## Cookie cross-subdomain

Para sessão compartilhada entre `cad.` e `app.` (quando fizer sentido):

| Atributo | Valor |
|---|---|
| `Domain` | `.exemplo.ong.br` (raiz da associação) |
| `Path` | `/` |
| `HttpOnly` | `true` |
| `Secure` | `true` (produção) |
| `SameSite` | `Lax` |

CORS da API deve listar as origens dos apps (`cad.`, `admin.`, `app.`, `termos.`). Detalhes: [`../api/authentication.md`](../api/authentication.md).

## Estratégia de migração

| Fase | Ação |
|---|---|
| **Agora** | Documentar + criar `apps/registration` no schema/API novos |
| Em paralelo | Manter `cadastramento/` legado em produção até cutover |
| Próximo | Documentar + criar `apps/admin` (dados, `system_configs`, operadores) |
| Depois | Migrar painel para `apps/panel` reusando `api-client` / `auth-session` |
| Depois | Implementar `apps/doc-sign` (nativo; ver [doc-sign/](./doc-sign/README.md)) |

Não é obrigatório mover o painel no mesmo PR do cadastramento — a estrutura acima existe para **não pintar o cadastramento num canto** que impeça o painel.

## Tooling sugerido

| Item | Sugestão |
|---|---|
| Workspaces | npm workspaces na raiz |
| Bundler por app | Vite |
| Linguagem (registration) | **JavaScript** (React) |
| Testes API | `kunk-api` — `npm test` (node:test) |

Stack visual do **registration**: preservar Bootstrap + CSS custom do legado (ver [cadastramento/ui-ux.md](./cadastramento/ui-ux.md)), aprimorando layout sem trocar a identidade.
