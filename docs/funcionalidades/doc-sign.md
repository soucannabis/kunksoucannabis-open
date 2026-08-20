# Doc-sign — mapa de funcionalidades

> Termos e assinaturas nativos (`apps/doc-sign`, porta **4258**).
> Índice: [README.md](./README.md)

**Auth:** operador Administrador (gestão); assinatura pública por token. 
**Testes do app:** Playwright (`npm run test:e2e:doc-sign`). Fluxo de assinatura coberto na **API**.

## Gestão (admin)

| Módulo | Página | Descrição | Testes |
|---|---|---|---|
| Login | `/login` | Entrada Administrador | e2e: Sim · API: Sim (auth) |
| Nova senha | `/nova-senha` | Reset operador | e2e: Não · API: Sim |
| Lista de termos | `/termos` | Contratos emitidos | e2e: Sim · API: Sim |
| Detalhe do termo | `/termos/:id` | Ver / reenviar termo | e2e: Não · API: Sim |
| Auditoria | `/termos/:id/audit` | Log de visualização/assinatura | e2e: Não · API: Sim |
| Modelos | `/modelos` | Templates `self` / `with_patient` | e2e: Sim · API: Sim |
| Editor TipTap | `/modelos/:kind` | Editar e publicar modelo | e2e: Sim · API: Sim |

## Assinatura (público)

| Módulo | Página | Descrição | Testes |
|---|---|---|---|
| Assinar | `/assinar/:token` | Draw / type / upload + concluir | e2e: Não · API: Sim |

## Transversais

| Módulo | Página | Descrição | Testes |
|---|---|---|---|
| Storage cloud | (anexos / PDF) | Upload com bucket ativo | e2e: Sim |
| Web Vitals / error boundary | (transversal) | Telemetria e falhas UI | npm: Não · e2e: Não |

## Redirects

| De | Para |
|---|---|
| `/contratos` | `/termos` |
| `/contratos/:id` | `/termos/:id` |
