# Directus — Vínculos lógicos (sem FK)

Gerado em: 2026-07-08T15:39:18.694Z

Campos usados pelo aplicativo para conectar entidades, mas **sem** relação/FK registrada no Directus.
Esses vínculos são candidatos prioritários a virarem chaves estrangeiras no novo PostgreSQL.

| De (collection.field) | Para (collection.field) | Tipo | Nota |
|---|---|---|---|
| `Orders.user_code` | `Users.user_code` | character varying | Espelho do user_code do associado; FK real é Orders.user → Users.id. |
| `Users.responsible_for` | `Users.user_code` | character varying | user_code do paciente (registro do responsável); no schema alvo vira patient_user_code. |
| `services.associate` | `Users.user_code` | character varying | Código/identificador do associado, sem FK. |
| `Reception.associate_code` | `Users.user_code` | character varying | Código do associado no atendimento, sem FK. |
| `Kunk_Users.associates` | `Users.user_code` | character varying | Lista/texto de associados vinculados ao usuário interno. |
