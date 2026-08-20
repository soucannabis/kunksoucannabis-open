# Associados (lista completa)

> Inventáriversões anteriores. **Spec de implementação:** [../associados/README.md](../associados/README.md) (mesma página que cadastramento).

## Identificação

| Campo | Valor |
|---|---|
| **Rota** | `/app/associados` |
| **Componente** | `Dash (prop associatesTable)` |
| **Permissões** | Administrador | Acolhimento | Produção |

## Descrição

Mesma tela de cadastramento com listagem ampla (`limit` alto / `-1`). Preferir unificar no OSS com a rota de cadastramento e um modo “lista completa”.

## Funcionalidades

- Mesmas de [Cadastramento](./cadastramento.md) / [associados/](../associados/README.md)

## Decisão open-source

| Opção | Escolha |
|---|---|
| **Manter** | Atalho opcional ou filtro “todos” na mesma página |
| **Remover** | Duplicar componente só por rota |
| **Modificar** | Unificar UX |
| **Notas** | Core — ver spec [associados/](../associados/README.md) |

## Status

`spec pronta` — unificar com cadastramento.
