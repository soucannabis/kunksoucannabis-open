# Home / redirecionamento

> Documentação funcional da página legada — base para decidir o que manter, remover ou modificar no Kunk open-source.

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/` |
| **Componente** | `LoginUser | Navigate (condicional)` |
| **Permissões** | Pública (anônimo) ou autenticado (redirect por papel) |

## Descrição

Entrada raiz do sistema. Sem sessão exibe login; com sessão redireciona conforme o papel do usuário.

## Funcionalidades

- Se anônimo: renderiza tela de login
- Staff (Administrador / Acolhimento / Produção) → `/app`
- Parceiro → `/relatorio/pedidos?pa={internal_code}`
- Prescritor → `/relatorio/pedidos?p={internal_code}`
- Outros papéis → `/nao-autorizado`

## Integrações externas e serviços

| Serviço | Uso nesta página |
|---|---|
| **Auth (`/api/auth/*`)** | Login e sessão via cookie; `/api/auth/me` no bootstrap |

## Dependências de outras páginas / módulos

- `/login`
- `/app`
- `/relatorio/pedidos`

## Observações

- —

## Decisão open-source

> Preencher na revisão de escopo.

| Opção | Escolha |
|---|---|
| **Manter** | |
| **Remover** | |
| **Modificar** | |
| **Notas** | Core de autenticação e roteamento por papel. |

## Status

`documentado` — aguardando definição de escopo OSS.
