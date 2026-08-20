# Search global — Fluxos

## 1. Abrir busca

```
Usuário autenticado em qualquer /app/*
  → clica FAB "Pesquisar"
  → Dialog maxWidth=lg
  → escolhe entidade (Associados | Pedidos | Serviços | Triagem)
  → digita q → Consultar
  → tabela de resultados (paginada, sort por header)
```

## 2. Critérios por entidade

| Tab UI | `entity` API | Critério de `q` |
|---|---|---|
| Associados | `users` | e-mail (se contém `@`); telefone (≥8 dígitos só números); senão nome (`fullname` / nome+sobrenome, acento-insensitive) |
| Pedidos | `orders` | modo **nome** (`associate_name` / fullname) **ou** modo **tracking** (`tracking_code`) |
| Serviços | `services` | nome do associado (`associate_name`) |
| Triagem | `reception` | nome / sobrenome (`name`, `last_name` / `full_name`) |

Hints de UI :

- Associados: “Permitido pesquisar por nome, telefone e e-mail. Pacientes aparecem com o responsável.”
- Pedidos: nome **ou** rastreamento conforme radio
- Serviços: nome do associado vinculado
- Triagem: nome/sobrenome na fila

## 3. Enriquecimento de associados (`gs_meta`)

Se o hit for **paciente** (`status=patient` ou tem `responsible_code`):

1. Resolver o **responsável**
2. `open_user_code` = `user_code` do responsável (abrir sempre o responsável)
3. `display_name_blocks`: blocos “Responsável” / “Paciente” com nomes

Se o hit for responsável com paciente(s) no funil, opcional mostrar paciente vinculado (histórico usava `responsible_for`; OSS lista via `patients` / primeiro paciente se necessário — **sem** depender de ativo global).

Campos de display: `display_status`, `display_email`, `display_phone`, `display_created`.

## 4. Ações ao abrir / extras

| Entidade | Ação principal | Extra |
|---|---|---|
| Associados | Nova aba `/app/acolhimento/associados?a={open_user_code}` | Botão **Triagem** → cria reception e navega para `/app/acolhimento/triagem` |
| Serviços | Nova aba `/app/acolhimento/servicos?s={associate_name}&h={ISO date}` | Filtra/destaca serviço na lista (comversões anteriores) |
| Pedidos | Nova aba URL de pedidos com `?p={order_code}` (helper OSS equivalente a `buildOrdersPageUrl`) | — |
| Triagem | Abrir fila com `?t={code}` ou `/app/acolhimento/triagem?t=` | Desabilitar se sem `code` |

Histórico abria triagem pública `/triagem?t=`. No OSS preferir a **fila autenticada** `/app/acolhimento/triagem?t=` (operador); manter público só se o produto ainda expuser tela pública.

## 5. Integração com páginas

Cada página já deve honrar query params:

| Página | Params |
|---|---|
| Associados | `a` → carrega user + abre modal |
| Serviços | `s` + `h` → filtro/highlight; `u` → novo serviço pré-selecionado (triagem) |
| Pedidos | `p` → abre/foca pedido |
| Triagem | `t` → foca item `code` |

Implementar/ajustar handlers se ainda não existirem no `apps/kunk`.

## 6. Paginação e sort

- `page`, `limit` (default 100, max 100)
- `sortField` / `sortDir` whitelisted por entidade
- Defaults: users/orders `created_date desc`; services `consultation_date`/`date_created`; reception `date_created`
