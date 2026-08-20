# Triagem — Decisões e checklist

## Decisões fechadas (requisitos)

| # | Decisão |
|---|---|
| 1 | Admin tem área **Triagem** com config do **formulário** (campos padrão removíveis + personalizados) em `system_configs` |
| 2 | Página operacional em `apps/kunk` como legado, **sem** Beeviral/Utalk/outros serviços externos |
| 3 | Status em `system_configs`; Espera = form preenchido; Concluído = terminal; admin cria outros; avatar abre seletor |
| 4 | Submit do form com e-mail **linka** associado existente automaticamente |
| 5 | Pedidos/Serviços **somente** se associado linkado |
| 6 | Contabilizar conclusão (`completion_reason` Pedido/Serviço) como no legado |
| 7 | **Sem** histórico de doações na triagem |
| 8 | Módulo documentos/dados **existe**, default **desabilitado**, ativável no admin |

## Decisões de implementação (preencher ao executar)

| Tópico | Opções | Escolha |
|---|---|---|
| Hospedagem do form público | Rota pública em `apps/kunk` vs app dedicado vs registration | |
| Finalizar no redirect de serviço vs só no create | Imediato (legado agendamento) vs só create | |
| Contagens | Client filter vs `GET /reception/status-counts` | |
| Value de Espera/Concluído | `waiting`/`done` vs labels legado em PT | Preferir slugs estáveis `waiting`/`done` |

## Não portar (checklist negativo)

- [ ] Beeviral (`bvid`, batch nomes)
- [ ] Histórico de doações (modal e totais)
- [ ] Dependência de Directus `/api/directus/reception`
- [ ] Envio de mensagens WhatsApp via Utalk (`POST /message`) — fora de escopo; ver [modules/utalk.md](../../../api/modules/utalk.md)

## Utalk (portado — acesso apenas)

- Sync chat → attendant, transfer/assume/clear, link `chat_id`, FAB sync espera
- Token **único** no Admin (Serviços externos); `utalk_id` por atendente
- **Sem** token por usuário e **sem** envio de mensagem pelo Kunk

## Checklist de entrega

### SQL / config

- [ ] Seed `alter-system-configs-triage.sql` (`form.fields`, `form.custom_fields`, `statuses`, `module.associate_docs`)
- [ ] Label `triage` em systems do admin se listado em `/configs`

### Admin

- [ ] Nav + rotas `/triagem`, `/triagem/formulario`, `/triagem/status`, `/triagem/modulos`
- [ ] UI campos padrão (enable/require/label/order) + custom fields CRUD
- [ ] UI status (system protegidos + custom)
- [ ] Switch módulo documentos/dados (default off)

### API

- [ ] `POST /reception/public` (ou equivalente) com validação + link e-mail
- [ ] `GET` schema do form
- [ ] Validação de status contra config
- [ ] Link/unlink associate
- [ ] Integração complete ao criar pedido/serviço
- [ ] (Opcional) status-counts

### apps/kunk

- [ ] Substituir stub `TriagePage` pelo layout sidebar + tabela
- [ ] Contagens e troca de status via avatar
- [ ] Exibir custom fields
- [ ] Gate Pedido/Serviço por `associate_code`
- [ ] Gate módulo docs pela flag
- [ ] Sem doações / Beeviral (Utalk: sync/transfer quando módulo ativo)
- [ ] E2E básicos (lista, troca status, bloqueio sem vínculo)

### Docs

- [ ] Atualizar `pages/triagem.md` para `implementando` / `feito` quando aplicável
- [ ] Linkar esta pasta no README do Kunk e no índice geral
