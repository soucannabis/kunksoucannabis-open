# Clientes institucionais — Documentação de implementação

> Cadastro de clientes que **não são associados** mas podem fazer pedidos (outras associações / empresas / pessoas).
> Página: `/app/acolhimento/clientesinstitucionais` · tabela `institutional_clients`.

## Objetivo

1. Tabela própria (não subset de `users`)
2. Empresa opcional + representante com CPF sempre obrigatório
3. Pedidos e etiquetas com CNPJ (empresa) ou CPF (pessoa)
4. Página CRUD no painel Kunk + novo pedido via `?ic=`

## Índice

| Documento | Conteúdo |
|---|---|
| [fields.md](./fields.md) | Campos da tabela e regras de nome/documento |
| [api.md](./api.md) | Endpoints `/institutional-clients` e vínculo em orders |
| [flow.md](./flow.md) | Fluxos de cadastro e pedido |

## Fora de escopo (v1)

- Login/portal próprio do cliente institucional
- Triagem / serviços / acolhimento
- Migração de dados 
