# Cadastramento — UI / UX

> Identidade visual validada em produção. Aprimorar layout; não trocar a ideia.

## Direção

O cadastramento **não** deve migrar para o look do painel (MUI) nem para um visual genérico de template.

Manter:

- Atmosfera verde escura + formulários claros
- Sidebar (ou equivalente mobile) de **progresso do cadastro**
- CTAs Bootstrap-like (primary / success) e contato em destaque
- Sensação de “funil de inscrição associativa”, não dashboard

Aprimorar:

- Responsividade real (hoje o layout decide com `innerWidth` no render)
- Acessibilidade (labels, foco, erros anunciados)
- Consistência de máscaras (CEP no paciente, etc.)
- Tipografia e espaçamento sem poluir a primeira dobra de cada etapa
- Componentes reutilizáveis em `packages/ui` / `packages/forms`

## Paleta e atmosfera (legado SouCannabis)

| Elemento | Valor |
|---|---|
| Fundo | `#132712` com overlay ~0.9; imagem de fundo no content |
| Navbar | `#4e774d` + sombra |
| Sidebar | gradiente `#e5e5e5` → `#cfd6db` |
| Inputs | fundo `#f0f5fa`, sombra inset |
| Texto de título | branco sobre o fundo escuro |
| Contato | `#e3bf0d` (warning) |

Tokens: ver [`../theming.md`](../theming.md).

## Layouts

### Público (login / e-mail)

- Desktop: coluna central ~50%, logo grande, botões “Se cadastrar como Associado” + “Login”
- Mobile: logo + forms empilhados
- Sem sidebar de progresso

### Autenticado (funil)

- Desktop: `Menu` + `Sidebar` (etapas) + `content`
- Mobile: `MenuMobile` + `TopBarMobile` + content
- Sidebar / menu animam conforme **`associate_status` 1–5** (check / atual / bloqueado) — ver [flow.md](./flow.md)

## Padrões de formulário a preservar

- Labels claros; campos obrigatórios visíveis
- Erro por campo + alerta resumido (padrão `AlertError`)
- Radios de `responsible_type` e opções de `/consulta` como **cards** (`btn-outline-primary`), não lista seca
- **Assistente de documentos:** escolha RG vs CNH; RG frente+verso; CNH só frente; indica o que falta
- Upload com área grande tipo botão (`.label-upload`), feedback “enviado”
- CIAP2 com contador “até 10 motivos”, categorias + busca (como legado) e ajuda contextual
- Submit com erros: persiste campos válidos; destaca inválidos; alinha a `invalid_fields`
- CTA de contato sempre acessível (acolhimento)

## O que não colocar no funil

- Cards decorativos sem interação
- Stats, badges flutuantes, chips de promo
- Troca da paleta verde por tema roxo/cream genérico
- Hero marketing na área logada — o “hero” do cadastro é o progresso + formulário

## Stack visual sugerida (registration)

| Peça | Escolha |
|---|---|
| Base | React + Vite + TypeScript |
| CSS | CSS variables (`packages/theme`) + CSS modules ou um único `registration.css` |
| Componentes | Pode manter Bootstrap 5 no app de cadastro por fidelidade; isolar em wrappers |
| Ícones | Manter simples (como o legado); evitar librário pesado sem necessidade |

O painel pode continuar em MUI — **skins diferentes por app são aceitáveis** desde que tokens de marca (logo, nome, verde institucional) venham do mesmo `packages/theme`.

## Copy

- Textos de boas-vindas e contato via env (`VITE_WELCOME_TEXT`, `VITE_CONTACT_URL`)
- Remover menção a comprovante de endereço (`proof_of_address` fora do OSS)
