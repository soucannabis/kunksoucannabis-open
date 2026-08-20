# Clientes institucionais

> Documentação funcional — implementação OSS.

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/app/acolhimento/clientesinstitucionais` |
| **Componente** | `InstitutionalClientsPage` |
| **Arquivo** | `apps/kunk/src/pages/reception/InstitutionalClientsPage.jsx` |
| **Tabela** | `institutional_clients` |
| **Permissões** | Administrador · Acolhimento (CRUD) · Produção (leitura) |

## Descrição

CRUD de clientes institucionais (não associados) que podem fazer pedidos. Empresa opcional + representante com CPF obrigatório. Pedidos/etiquetas usam CNPJ da empresa ou CPF do representante.

## Documentação detalhada

Ver pasta [`../clientes-institucionais/`](../clientes-institucionais/README.md).

## Status

`implementado` — tabela própria + página + vínculo em pedidos/etiquetas.
