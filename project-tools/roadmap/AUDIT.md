# Auditoria — código × docs × roadmap

Gerado a partir da revisão das rotas/menus vs `project-tools/docs/funcionalidades/` e o inventário do protótipo HTML.

## Ordem do roadmap

1. **Admin** — configuração da instância  
2. **Kunk** — operação diária  
3. **Sistema de cadastro** (Registration) — funil do associado  
4. **Doc-sign** — termos e assinatura  

Dentro de cada app: do mais visível/crítico para o menos.

## Gaps encontrados na documentação

### Admin (`admin.md`)

**Faltavam no mapa de funcionalidades:** Home (`/home`), Documentação (`/inicio`), Dados da associação, Sistema de cadastro, Credenciais de suporte, API (`/acesso-api`), Instalação.

**Obsoletos / desatualizados:** `/arquivos` (redirect para `/dados`), `/configs` como UI de variáveis, Aparência em `/aparencia` (agora `/kunk/aparencia`; logo/título em Dados da associação).

**Roadmap:** **Armazenamento** e **Backups** são folhas separadas (`admin-storage` / `admin-backups`) na mesma página `/armazenamento` (hash `#backup`).

### Kunk (`kunk.md`)

Páginas principais ok. **Fracos/ausentes:** QuickNav, tema, notificações, PaymentModal, embed `/contato?embed=1`, profundidade do modal de Associados, descrição de Profissionais (“saldo de doação” imprecisa).

### Registration (`registration.md`)

**Maior desalinhamento:** `/finalizar` (canônico) ainda documentado como `/consulta`; **`/contato`** ausente; fase “receita/conclusão” desatualizada; Bem-vindo marcado como e2e parcial (há cobertura no funil).

### Doc-sign (`doc-sign.md`)

Quase completo. **Obsoleto:** “reenviar termo”. **Faltam:** gate de dados da associação, modelos custom, detalhe do editor (logo/PDF).

**Roadmap:** folha dedicada **Criar / emitir termo** (`ds-criar-termo`) — modal Novo termo + `POST /doc-sign/contracts` (antes só aparecia embutido em “Lista de termos”).

## Protótipo HTML

Arquivo atualizado: `data/tree.json` — inventário completo na ordem acima, com `baseline` de testes quando conhecido.

Abrir:

```bash
npx --yes serve project-tools/roadmap -p 4177
```
