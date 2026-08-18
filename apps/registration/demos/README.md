# Demos em vídeo (Playwright)

Catálogo das demos gravadas do Kunk / cadastramento. Cada comando gera um `.webm` novo em `demos/output/<pasta>/`.

## Pré-requisitos gerais

Rodar a partir de `apps/registration`:

```bash
cd apps/registration
```

Serviços locais típicos:

| Serviço | URL / porta |
|---------|-------------|
| API (`kunk-api`) | `http://localhost:4250` |
| Kunk (`apps/kunk`) | `http://localhost:4257` |
| Cadastramento (`apps/registration`) | `http://localhost:4255` |
| Assinatura (`apps/doc-sign`) | `http://localhost:4258` (só cadastro com termo) |

Browser: Microsoft Edge (`DEMO_CHANNEL=msedge` por padrão).

Saída padrão: `apps/registration/demos/output/`  
Override: `DEMO_OUT_DIR=/caminho npm run demo:…`

---

## Catálogo

| Demo | Pasta de saída | Comando | Script |
|------|----------------|---------|--------|
| Login Kunk | `login/` | `npm run demo:login` | `scripts/demo-record-login.mjs` |
| Cadastro (funil) | `cadastro/` | `npm run demo:cadastro` | `scripts/demo-record-cadastro.mjs` |
| Cadastro mobile | `cadastro/` | `npm run demo:cadastro:mobile` | idem (`--mobile`) |
| Cadastro desktop + mobile | `cadastro/` | `npm run demo:cadastro:all` | `scripts/demo-record-cadastro-all.mjs` |
| Triagem (form público → Kunk) | `triagem/` | `npm run demo:triagem` | `scripts/demo-record-triagem.mjs` |
| Triagem mobile | `triagem/` | `npm run demo:triagem:mobile` | idem (`--mobile`) |
| Triagem → Pedido | `triagem-pedido/` | `npm run demo:triagem-pedido` | `scripts/demo-record-triagem-pedido.mjs` |
| Triagem → Atendimento | `triagem-servico/` | `npm run demo:triagem-servico` | `scripts/demo-record-triagem-servico.mjs` |
| Contato → Pedido (Loggi / produção) | `contato-pedido/` | `npm run demo:contato-pedido` | `scripts/demo-record-contato-pedido.mjs` |
| Atendimento + Pix / comprovante | `atendimento-servicos/` | `npm run demo:atendimento-servicos` | `scripts/demo-record-atendimento-servicos.mjs` |
| Associados (Ana Silva) | `associados/` | `npm run demo:associados` | `scripts/demo-record-associados.mjs` |
| Relatório de atendimentos / contestação | `relatorio-servicos/` | `npm run demo:relatorio-servicos` | `scripts/demo-record-relatorio-servicos.mjs` |
| Triagem staff (Concluído / linkar) | `acolhimento-triagem/` | `npm run demo:acolhimento-triagem` | `scripts/demo-record-acolhimento-triagem.mjs` |
| Dashboard analytics | `dashboard/` | `npm run demo:dashboard` | `scripts/demo-record-dashboard.mjs` |
| Assinatura de termos | `assinatura/` | `npm run demo:assinatura` | `scripts/demo-record-assinatura.mjs` |
| PDF produção (só visualização) | `pdf-producao/` | `npm run demo:pdf-producao` | `scripts/demo-record-pdf-producao.mjs` |
| Check menu (diagnóstico) | `check-menu/` | `npm run demo:check-menu` | `scripts/demo-check-menu.mjs` |

Arquivos gerados: `desktop-YYYY-MM-DDTHH-mm-ss.webm` (ou `mobile-…` nas variantes mobile).

---

## Detalhe por demo

### Login — `login/`

Login no Kunk com administrador.

```bash
npm run demo:login
```

### Cadastro — `cadastro/`

Funil público: conta → dados → docs → termo → finalizar.

```bash
npm run demo:cadastro
npm run demo:cadastro:mobile
npm run demo:cadastro:all
```

Env úteis: `DEMO_APP_URL`, `DEMO_EMAIL`, `DEMO_PASSWORD`, `DEMO_HOLD_MS`, `DEMO_CLEANUP=1`, `DEMO_STOP_AT=welcome`.

### Triagem (form → fila) — `triagem/`

Formulário público de triagem, login Acolhimento e página de Triagem.

```bash
npm run demo:triagem
npm run demo:triagem:mobile
```

Env: `DEMO_KUNK_URL`, `DEMO_ASSOCIATE_EMAIL`, `DEMO_OPERATOR_EMAIL`, `DEMO_OPERATOR_PASSWORD`.

### Triagem → Pedido — `triagem-pedido/`

Fila Espera → Novo Pedido → Pagamento concluído + filtro.

```bash
npm run demo:triagem-pedido
```

### Triagem → Atendimento — `triagem-servico/`

Fila → Serviço → Pagamento Concluído → Info → filtro pagos.

```bash
npm run demo:triagem-servico
```

### Contato → Pedido — `contato-pedido/`

`/contato` → triagem → pedido com frete Loggi → tracking → pagamento → PDF produção.

```bash
DEMO_ASSOCIATE_EMAIL=associado@soucannabis.ong.br \
  npm run demo:contato-pedido
```

### Atendimento + Pix — `atendimento-servicos/`

Reception Ana Silva → atendimento → Pix / comprovante.

```bash
DEMO_ASSOCIATE_EMAIL=associado@soucannabis.ong.br \
  npm run demo:atendimento-servicos
```

### Associados — `associados/`

Lista + modal completo de Ana Silva (histórico, prescritor, etc.).

```bash
npm run demo:associados
```

### Relatório de atendimentos — `relatorio-servicos/`

Staff scroll → portal Marina (contestação Iris / validação Karen) → corrige preço → resolve contestação.

```bash
DEMO_PROFESSIONAL_EMAIL=profissional@soucannabis.ong.br \
DEMO_PROFESSIONAL_PASSWORD='Marina@2026!' \
  npm run demo:relatorio-servicos
```

### Triagem staff (Concluído) — `acolhimento-triagem/`

`/app/acolhimento/triagem`: filtro Concluído → busca Ana Silva → assumir / transferir / linkar → menu Ações.

```bash
npm run demo:acolhimento-triagem
```

### Dashboard — `dashboard/`

`/app/relatorios/dashboard`: scroll em Associados → Atendimentos → Pedidos → Triagem.

```bash
npm run demo:dashboard
```

### Assinatura de termos — `assinatura/`

Login Administrador em `:4258` → Modelos → editar/publicar o primeiro → Termos → olho do primeiro termo → baixar PDF → audit log.

```bash
npm run demo:assinatura
```

### PDF produção — `pdf-producao/`

Só abre um PDF de produção já gerado (Downloads ou `DEMO_PDF_PATH`). Sem login.

```bash
npm run demo:pdf-producao
DEMO_PDF_PATH=/caminho/arquivo.pdf npm run demo:pdf-producao
```

### Check menu — `check-menu/`

Diagnóstico do clique Relatórios → Atendimentos no sidebar (não é roteiro de produto).

```bash
npm run demo:check-menu
```

---

## Variáveis comuns

| Variável | Default | Uso |
|----------|---------|-----|
| `DEMO_KUNK_URL` | `http://localhost:4257` | App Kunk |
| `DEMO_DOC_SIGN_URL` | `http://localhost:4258` | Assinatura de termos |
| `DEMO_APP_URL` | `http://localhost:4255` | Cadastramento |
| `DEMO_CHANNEL` | `msedge` | Browser Playwright |
| `DEMO_SLOW_MO` | `350` | Atraso entre ações (ms) |
| `DEMO_HOLD_MS` | `15000` (varia por script) | Pausa final no vídeo |
| `DEMO_OUT_DIR` | `demos/output` | Pasta base dos `.webm` |
| `DEMO_OPERATOR_EMAIL` | `acolhimento@kunk-api.test` | Login staff |
| `DEMO_OPERATOR_PASSWORD` | `TestAcol123!` | Senha staff |
| `DEMO_ASSOCIATE_EMAIL` | (seed / Ana Silva) | Associado das demos |
| `DEMO_PROFESSIONAL_EMAIL` | `profissional@soucannabis.ong.br` | Portal Marina |
| `DEMO_PROFESSIONAL_PASSWORD` | `Marina@2026!` | Senha Marina |

---

## Regravar tudo (ordem sugerida)

```bash
cd apps/registration

npm run demo:login
npm run demo:cadastro
npm run demo:triagem
npm run demo:triagem-pedido
npm run demo:triagem-servico
DEMO_ASSOCIATE_EMAIL=associado@soucannabis.ong.br npm run demo:contato-pedido
DEMO_ASSOCIATE_EMAIL=associado@soucannabis.ong.br npm run demo:atendimento-servicos
npm run demo:associados
DEMO_PROFESSIONAL_EMAIL=profissional@soucannabis.ong.br \
  DEMO_PROFESSIONAL_PASSWORD='Marina@2026!' \
  npm run demo:relatorio-servicos
npm run demo:acolhimento-triagem
npm run demo:dashboard
npm run demo:pdf-producao
```

Helpers compartilhados: `scripts/demo-lib.mjs`, `scripts/demo-triagem-shared.mjs`, `scripts/demo-sidebar.mjs`.
