# Cadastramento — mapa de funcionalidades

> App público de onboarding do associado (`apps/registration`, porta **4255**).
> Índice: [README.md](./README.md)

**Auth:** sessão de associado (`users`). 
**Testes do app:** só Playwright (`npm run test:e2e`). Sem Vitest.

## Módulos / páginas

| Módulo | Página | Descrição | Testes |
|---|---|---|---|
| Cadastro (e-mail) | `/cadastro` | Criar conta de associado | e2e: Sim |
| Login | `/login` | Entrar na sessão | e2e: Sim |
| Nova senha | `/nova-senha` | Reset de senha | e2e: Sim |
| Shell / home | `/` | Redirect conforme fase | e2e: Sim |
| Bem-vindo | `/bem-vindo` | Fase 1 — boas-vindas | e2e: Parcial (guards) |
| Dados do responsável | `/cadastro-associado` | Fase 1–2 — formulário do associado | e2e: Sim |
| Dados do paciente | `/cadastro-paciente` | Fase 2 — paciente / vínculo | e2e: Sim |
| Documentos | `/documentos` | Fases 3–4 — RG/CNH, comprovantes, termos | e2e: Sim |
| Consulta | `/consulta` | Fase 5 — receita / conclusão | e2e: Sim |
| Cadastro concluído | `/cadastro-concluido` | Tela final do funil | e2e: Sim |
| Guards de fase | (todas autenticadas) | Redireciona conforme `associate_status` | e2e: Sim |
| Storage cloud | `/documentos` (upload) | Upload com bucket ativo | e2e: Sim |
| Web Vitals | (transversal) | Envio de métricas ao backend | npm: Não · e2e: Não |
| Erros de sistema | (boundary) | Captura e reporte de falhas UI | npm: Não · e2e: Não |

## Serviços de API usados (referência)

Cobertura principal na API — ver [kunk-api.md](./kunk-api.md).

| Serviço | Uso no app | Testes (API) |
|---|---|---|
| Auth associado | register / login / reset / me | Sim |
| Users (me / patients) | formulários do funil | Sim |
| Files | upload de documentos | Sim |
| Doc-sign / terms | fase 4 (redirect / status) | Sim |
| Web vitals | telemetria | Sim (POST + admin) |
| System errors | boundary | Sim (POST + admin) |
