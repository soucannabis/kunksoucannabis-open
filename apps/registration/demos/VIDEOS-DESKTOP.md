# Vídeos desktop — catálogo atual

Última gravação de cada demo de produto (desktop), escolhida pelo **timestamp no nome do arquivo** (`desktop-YYYY-MM-DDTHH-mm-ss.webm`), não pelo mtime do SO.

Excluídos: `login`, `pdf-producao`, `check-menu`, partes Admin isoladas (`admin-part1` … `admin-part4`).

**Total: 12 vídeos · ~25:29**

| # | Demo | Duração | Último vídeo |
|---|------|---------|--------------|
| 1 | Cadastro | 1:15 | [desktop-2026-08-14T23-03-17.webm](output/cadastro/desktop-2026-08-14T23-03-17.webm) |
| 2 | Triagem (form → fila) | 0:56 | [desktop-2026-08-11T19-41-53.webm](output/triagem/desktop-2026-08-11T19-41-53.webm) |
| 3 | Triagem → Pedido | 1:01 | [desktop-2026-08-11T20-40-11.webm](output/triagem-pedido/desktop-2026-08-11T20-40-11.webm) |
| 4 | Triagem → Atendimento | 1:16* | [desktop-2026-08-14T12-50-29.webm](output/triagem-servico/desktop-2026-08-14T12-50-29.webm) |
| 5 | Acolhimento / Triagem (Concluído) | 1:26 | [desktop-2026-08-16T15-36-01.webm](output/acolhimento-triagem/desktop-2026-08-16T15-36-01.webm) |
| 6 | Dashboard | 1:46 | [desktop-2026-08-16T14-52-40.webm](output/dashboard/desktop-2026-08-16T14-52-40.webm) |
| 7 | Associados | 2:13 | [desktop-2026-08-16T15-23-24.webm](output/associados/desktop-2026-08-16T15-23-24.webm) |
| 8 | Atendimento + Pix | 2:13 | [desktop-2026-08-15T20-08-41.webm](output/atendimento-servicos/desktop-2026-08-15T20-08-41.webm) |
| 9 | Relatório de atendimentos | 2:42 | [desktop-2026-08-16T14-36-29.webm](output/relatorio-servicos/desktop-2026-08-16T14-36-29.webm) |
| 10 | Contato → Pedido | 4:34 | [desktop-2026-08-15T20-03-05.webm](output/contato-pedido/desktop-2026-08-15T20-03-05.webm) |
| 11 | Admin — Parte 1+2 | 3:15 | [desktop-2026-08-16T22-44-13.webm](output/admin-part1-2/desktop-2026-08-16T22-44-13.webm) |
| 12 | Admin — Parte 3+4 | 2:53 | [desktop-2026-08-16T23-06-10.webm](output/admin-part3-4/desktop-2026-08-16T23-06-10.webm) |

\* Duração estimada (arquivo WebM sem metadata completa).

## Admin (2 vídeos unificados)

Login: `admin@soucannabis.ong.br`.

| # | Conteúdo | Comando | Último vídeo |
|---|----------|---------|--------------|
| 1+2 | Associação, triagem, profissionais, loja, permissões | `npm run demo:admin:part1-2` | [desktop-2026-08-16T22-44-13.webm](output/admin-part1-2/desktop-2026-08-16T22-44-13.webm) |
| 3+4 | CIAP, aparência, sistema, usuários, API (token) | `npm run demo:admin:part3-4` | [desktop-2026-08-16T23-06-10.webm](output/admin-part3-4/desktop-2026-08-16T23-06-10.webm) |

Regravar:

```bash
cd apps/registration
npm run demo:admin:part1-2
npm run demo:admin:part3-4
# partes isoladas: demo:admin:part1 … part4
# ou: npm run demo:admin:all
```

## Links diretos

1. [Cadastro](output/cadastro/desktop-2026-08-14T23-03-17.webm)
2. [Triagem](output/triagem/desktop-2026-08-11T19-41-53.webm)
3. [Triagem → Pedido](output/triagem-pedido/desktop-2026-08-11T20-40-11.webm)
4. [Triagem → Atendimento](output/triagem-servico/desktop-2026-08-14T12-50-29.webm)
5. [Acolhimento / Triagem](output/acolhimento-triagem/desktop-2026-08-16T15-36-01.webm)
6. [Dashboard](output/dashboard/desktop-2026-08-16T14-52-40.webm)
7. [Associados](output/associados/desktop-2026-08-16T15-23-24.webm)
8. [Atendimento + Pix](output/atendimento-servicos/desktop-2026-08-15T20-08-41.webm)
9. [Relatório de atendimentos](output/relatorio-servicos/desktop-2026-08-16T14-36-29.webm)
10. [Contato → Pedido](output/contato-pedido/desktop-2026-08-15T20-03-05.webm)
11. [Admin — Parte 1+2](output/admin-part1-2/desktop-2026-08-16T22-44-13.webm)
12. [Admin — Parte 3+4](output/admin-part3-4/desktop-2026-08-16T23-06-10.webm)

Comandos para regravar: ver [README.md](README.md).
