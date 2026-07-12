# Sample data — Kunk OSS

Dados **fictícios** para popular o schema alvo em demos e instalação com sample data.

## Contagens

| Tabela | Qtd |
|---|---:|
| users | 100 |
| orders | 50 |
| partners | 10 |
| institutional_clients | 10 |
| professionals | 10 |
| products | 12 |
| services | 20 |
| reception | 15 |
| tags | 8 |
| system_users | 3 |
| reports | 3 |
| files + junctions | 5 / 5 / 5 / 3 |
| users_api | 1 |

## Login demo

| Campo | Valor |
|---|---|
| Email | `admin@demo.kunk.local` |
| Senha | `DemoAdmin123!` |
| Role | `Administrador` (acesso ao app admin em `:4256`) |

Operadores extras: `acolhimento@demo.kunk.local` e `producao@demo.kunk.local` (mesma senha).

Para testes automatizados use `admin@kunk-api.test` / `TestAdmin123!` (`ensureAdminUser`).

**Importante:** a suíte `npm test` **não** faz TRUNCATE das tabelas de negócio (sample data permanece). Só `npm run seed:sample` trunca ao reinstalar o seed.

## Como rodar

Com `DATABASE_URL` definido em `kunk-api/.env`:

```bash
cd kunk-api
npm run seed:sample
```

Isso **trunca** as tabelas de negócio (ordem segura de FKs) e reinsere o sample.

Somente gerar JSON em `fixtures/` (sem gravar no banco):

```bash
npm run seed:sample:generate
```

## Política

- Directus/produção = referência de *shape*, nunca fonte de dump.
- **Todos os campos** de cada tabela do `target-schema.sql` são preenchidos (sample completo).
- Produtos: catálogo `KNK-*` com concentrações em **mg**, sem cores/proporções do Directus.
- CPFs/emails/telefones são inventados e claramente de demo.
- `reception.status` usa os valores OSS da triagem (`waiting` / `done`), alinhados a `triage.statuses`.
