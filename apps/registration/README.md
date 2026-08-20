# apps/registration

App de **cadastramento** (funil de associados) — React + Vite + JavaScript.

## Subir local (sem Docker)

1. API em `http://localhost:8056` (`cd kunk-api && npm run dev`). Com Docker da API, use `:4250` e `VITE_API_PROXY_TARGET=http://localhost:4250`.
2. Na raiz do monorepo: `npm install`
3. `npm run dev:registration` → [http://localhost:4255](http://localhost:4255)

Copie `.env.example` → `.env` e ajuste `VITE_API_URL` se necessário.

## Docker (porta 4255 + hot reload)

```bash
cd apps/registration
cp .env.example .env
# Se a API roda no host: VITE_API_URL=http://host.docker.internal:4250/api/v1
docker compose up --build
```

Abra [http://localhost:4255](http://localhost:4255). Volumes montam `src/` e `packages/` para hot reload.

## Rotas

| Rota | Fase |
|---|---|
| `/cadastro`, `/login`, `/nova-senha` | pública |
| `/bem-vindo` | 1 |
| `/cadastro-associado` | 1–2 |
| `/cadastro-paciente` | 2 (`another`) |
| `/documentos` | 3–4 (fase 4 = stub termos) |
| `/finalizar` | Associado (pós-termo) |
| `/cadastro-concluido` | concluído |

Sessão: cookie HttpOnly `associate_session` na API (não no localStorage).

## Testes E2E (Playwright)

Pré-requisitos: API em `http://localhost:8056` (ou Docker `:4250`) e (opcional) front já em `:4255`.

```bash
# na raiz
npm run test:e2e

# ou
cd apps/registration && npx playwright test
npx playwright test --ui
```

Specs em `e2e/`: auth, forms do funil, documentos RG/CNH, fase 4 stub, fase 5, guards.

Documentação escrita de cada caso (dados, APIs, asserts): [`e2e/VALIDATION.md`](./e2e/VALIDATION.md).

## Demos gravadas (Playwright + Edge)

Grava `.webm` com Microsoft Edge (perfil limpo), em desktop (1366×768) e mobile.

Pré-requisitos comuns: API `:4250`, Microsoft Edge instalado.

### Cadastro (`demo:cadastro`)

Funil completo (conta → dados → docs → termo → finalizar).

Também precisa: registration `:4255`, doc-sign `:4258`.

```bash
cd apps/registration
npm run demo:cadastro          # só desktop
npm run demo:cadastro:mobile   # só mobile
npm run demo:cadastro:all      # desktop depois mobile
```

Saída: `demos/output/cadastro/desktop-*.webm` e `mobile-*.webm`.

### Triagem (`demo:triagem`)

Formulário público `/contato` → login operador → `/app/acolhimento/triagem`.

Também precisa: kunk `:4257`.

```bash
cd apps/registration
npm run demo:triagem
npm run demo:triagem:mobile
```

Saída: `demos/output/triagem/desktop-*.webm` e `mobile-*.webm`.

Operador default: `acolhimento@kunk-api.test` / `TestAcol123!` (criado automaticamente se o banco estiver disponível).

O formulário usa um **Associado já existente** (seed `@demo.kunk.local` ou `DEMO_ASSOCIATE_EMAIL`) para a triagem já nascer linkada.

### Triagem → Pedido (`demo:triagem-pedido`)

Login → triagem (1º item) → **Pedido** → cria pedido no carrinho → marca **Pagamento concluído** → filtra pelo chip desse status.

```bash
cd apps/registration
npm run demo:triagem-pedido
```

Saída: `demos/output/triagem-pedido/*.webm`.

### Triagem → Serviço (`demo:triagem-servico`)

Login → triagem (1º item) → **Serviço** → cria serviço → marca **Pagamento Concluído** → filtro **Somente pagos**.

```bash
cd apps/registration
npm run demo:triagem-servico
```

Saída: `demos/output/triagem-servico/*.webm`.

### Dashboard analytics (`demo:dashboard`)

Login → `/app/relatorios/dashboard` → percorre as abas **Associados**, **Atendimentos**, **Pedidos** e **Triagem** (cada uma com scroll fim↔topo em 10s) → hold final 15s.

Também precisa: kunk `:4257`.

```bash
cd apps/registration
npm run demo:dashboard
```

Saída: `demos/output/dashboard/*.webm`.

### Admin em 4 partes (`demo:admin:part1` … `part4`)

Tour do painel Admin (`:4256`) com login `admin@soucannabis.ong.br` (criado automaticamente). Cada parte: login → navegação no menu → scroll suave por página (sem mutar configs).

| Comando | Conteúdo | Saída |
|---|---|---|
| `npm run demo:admin:part1` | Associação, banco de dados, triagem | `demos/output/admin-part1/` |
| `npm run demo:admin:part2` | Profissionais, loja, permissões | `demos/output/admin-part2/` |
| `npm run demo:admin:part1-2` | Partes 1+2 em **um** vídeo | `demos/output/admin-part1-2/` |
| `npm run demo:admin:part3` | CIAP, aparência, importação, sistema | `demos/output/admin-part3/` |
| `npm run demo:admin:part4` | Usuários, API, webhooks, externos | `demos/output/admin-part4/` |
| `npm run demo:admin:part3-4` | Partes 3+4 em **um** vídeo | `demos/output/admin-part3-4/` |
| `npm run demo:admin:all` | As 4 partes em sequência | — |

Também precisa: API `:4250` + admin `:4256`. Variável opcional: `DEMO_ADMIN_URL`.

### Capas reutilizáveis (`covers:render`)

As capas usam um único layout HTML/CSS em `demos/covers/cover-layout.*`. Textos,
ícones e temas ficam em `demos/covers/covers.json`; para uma nova capa, basta
adicionar outra entrada. `backgroundImage` é opcional e permite trocar somente
o fundo sem duplicar o layout.

```bash
cd apps/registration
npm run covers:render                         # todas
npm run covers:render -- api-kunk dashboard  # IDs específicos
npm run covers:preview                        # preview HTML local
```

Saída: `demos/covers/generated/capa-<id>-1920x1080.png`.

### Projeto Shotcut (`kunk-demos.mlt`)

Projeto principal da timeline: `demos/output/kunk-demos.mlt`.

Após gravar uma demo, anexe o vídeo mais recente (ou um arquivo) no fim da trilha V1:

```bash
cd apps/registration
npm run shotcut:add -- demos/output/cadastro
npm run shotcut:add -- demos/output/triagem/desktop-....webm
```

Se o Shotcut estiver com o projeto aberto, recarregue pelo menu recente depois do append.

### Variáveis

`DEMO_KUNK_URL`, `DEMO_ADMIN_URL`, `DEMO_ASSOCIATE_EMAIL`, `DEMO_OPERATOR_EMAIL`, `DEMO_OPERATOR_PASSWORD`, `DEMO_SLOW_MO`, `DEMO_HOLD_MS`, `DEMO_CHANNEL`, `DEMO_APP_URL`, `DEMO_PASSWORD`, `DEMO_CLEANUP=1` (só cadastro).
