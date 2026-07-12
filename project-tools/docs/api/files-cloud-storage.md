# Storage em bucket (futuro)

> **Status:** planejamento — **não implementado**.  
> Hoje o driver é só **local** (`FILES_LOCAL_PATH` / `env.storagePath` em [`filesRepository.js`](../../../kunk-api/src/repositories/filesRepository.js)).  
> Este documento define como evoluir para object storage multi-cloud sem mudar o contrato HTTP de [`files.md`](./files.md).

## Objetivo

Permitir upload/download/delete de arquivos em **bucket** (object storage), com drivers:

| Provedor | Serviço | Driver id |
|---|---|---|
| Amazon | S3 (e compatíveis: MinIO, R2, etc.) | `s3` |
| Google | Cloud Storage (GCS) | `gcs` |
| Microsoft | Azure Blob Storage | `azure` |
| (atual) | Disco local | `local` |

A API pública (`POST/GET/DELETE /files`, `attach`) permanece igual. Só muda a camada de I/O do binário.

## Princípios

1. **Contrato HTTP estável** — clientes não escolhem o provedor; o servidor decide via env/config.
2. **Driver pluggable** — interface única; um driver ativo por instância (v1).
3. **Metadados no Postgres** — tabela `files` continua sendo a fonte de verdade do id/nome/mime; o blob fica no storage.
4. **Segredos só em env** — nunca no banco nem no JSON da API.
5. **Default OSS = `local`** — buckets são opt-in (deploy / self-host).
6. **Sem path arbitrário** — download sempre por `files.id`, nunca por path/key enviado pelo cliente.

## Modelo de dados

### Hoje

| Coluna | Uso |
|---|---|
| `files.storage_path` | Path absoluto no disco |

### Proposta (compatível)

| Coluna | Tipo | Uso |
|---|---|---|
| `storage_driver` | `VARCHAR` | `local` \| `s3` \| `gcs` \| `azure` (default = driver global) |
| `storage_key` | `TEXT` | Chave do objeto no bucket **ou** path relativo local |
| `storage_path` | `TEXT` | **Deprecar gradualmente** — manter preenchido em `local` por compat; em cloud pode espelhar `storage_key` ou ficar NULL |

Migração sugerida:

1. Adicionar `storage_driver` + `storage_key` (nullable).
2. Backfill: `storage_driver = 'local'`, `storage_key = storage_path` (ou path relativo).
3. Novos uploads preenchem os dois campos novos; `storage_path` só no driver local.
4. Em versão futura, tornar `storage_key` obrigatório e dropar `storage_path`.

Não é obrigatório ter um bucket por tenant na v1; um bucket por ambiente basta.

## Interface do driver

```js
/**
 * @typedef {object} StoredObject
 * @property {string} key          // storage_key persistido em files
 * @property {string} [etag]
 * @property {number} [size]
 */

class StorageDriver {
  /** @returns {Promise<StoredObject>} */
  async put({ key, buffer, mimeType, filename }) {}

  /** @returns {Promise<NodeJS.ReadableStream|Buffer>} */
  async get({ key }) {}

  /** @returns {Promise<void>} */
  async delete({ key }) {}

  /** URL assinada opcional (download direto do CDN/bucket) */
  async getSignedUrl?.({ key, expiresInSeconds }) {}
}
```

Implementações:

| Driver | SDK sugerido (Node) | Notas |
|---|---|---|
| `local` | `fs` (atual) | `key` = path sob `FILES_LOCAL_PATH` |
| `s3` | `@aws-sdk/client-s3` + `getSignedUrl` | Funciona com MinIO se endpoint custom |
| `gcs` | `@google-cloud/storage` | Service account JSON ou ADC |
| `azure` | `@azure/storage-blob` | Connection string ou AAD |

Registro (esboço):

```
kunk-api/src/storage/
  index.js          # factory getStorageDriver()
  local.js
  s3.js
  gcs.js
  azure.js
```

`filesRepository` chama só `getStorageDriver()` — zero `if (provider)` espalhado nas rotas.

## Configuração (env)

### Global

| Env | Default | Descrição |
|---|---|---|
| `FILES_DRIVER` | `local` | `local` \| `s3` \| `gcs` \| `azure` |
| `FILES_KEY_PREFIX` | `kunk/` | Prefixo comum das keys (`kunk/{uuid}_{safeName}`) |
| `FILES_MAX_BYTES` | `26214400` | Já alinhado ao multer (~25 MB) |
| `FILES_SIGNED_URL_TTL` | `300` | Segundos; `0` = só proxy via `/files/:id/download` |

### Local

| Env | Descrição |
|---|---|
| `FILES_LOCAL_PATH` | Diretório raiz (atual) |

### Amazon S3 (e compatíveis)

| Env | Descrição |
|---|---|
| `S3_BUCKET` | Nome do bucket |
| `S3_REGION` | Região |
| `S3_ACCESS_KEY_ID` | Credencial |
| `S3_SECRET_ACCESS_KEY` | Credencial |
| `S3_ENDPOINT` | Opcional (MinIO, R2, …) |
| `S3_FORCE_PATH_STYLE` | `true` para MinIO |

### Google Cloud Storage

| Env | Descrição |
|---|---|
| `GCS_BUCKET` | Nome do bucket |
| `GCS_PROJECT_ID` | Projeto GCP |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path do JSON da service account **ou** |
| `GCS_CLIENT_EMAIL` + `GCS_PRIVATE_KEY` | Alternativa inline (cuidado com `\n`) |

### Microsoft Azure Blob

| Env | Descrição |
|---|---|
| `AZURE_STORAGE_ACCOUNT` | Conta |
| `AZURE_STORAGE_CONTAINER` | Container (equiv. bucket) |
| `AZURE_STORAGE_CONNECTION_STRING` | Preferido em self-host **ou** |
| `AZURE_STORAGE_ACCOUNT_KEY` | Key da conta |
| `AZURE_STORAGE_SAS_TTL` | Opcional; senão usar `FILES_SIGNED_URL_TTL` |

Driver inválido ou credenciais faltando → falha no **boot** (ou no primeiro upload) com erro claro `STORAGE_MISCONFIGURED`, não 500 opaco.

## Fluxos

### Upload (`POST /files`)

```
multipart → multer (memória) → StorageDriver.put
  → INSERT files (id, filename, mime_type, storage_driver, storage_key, …)
  → 201 { id, url: /files/:id/download }
```

Key sugerida: `{FILES_KEY_PREFIX}{yyyy}/{mm}/{uuid}_{safeFilename}`.

### Download (`GET /files/:id/download`)

**Modo A — proxy (default, igual ao atual)**  
Auth na API → `driver.get` → stream na response. Simples; tráfego passa pelo app.

**Modo B — redirect assinado (opcional)**  
Auth na API → `driver.getSignedUrl` → `302` para URL do bucket. Menos carga no app; exige CORS/bucket policy corretos.

Flag: `FILES_DOWNLOAD_MODE=proxy|redirect` (default `proxy`).

### Delete (`DELETE /files/:id`)

1. Remover junctions (`orders_files`, …).  
2. `DELETE FROM files`.  
3. `driver.delete({ key })` (best-effort se objeto já sumiu).

Ordem: preferir apagar DB depois do blob **ou** blob depois do DB com job de GC — escolher uma e documentar. Recomendação v1: **blob depois do DB** (se delete do blob falhar, logar + fila de retry; evita órfão referenciado na API).

## Segurança

- Continuar exigindo auth + RBAC `files:*` (e, no futuro, permissão na entidade pai no download anexado).
- Validar MIME allowlist e tamanho **antes** do `put`.
- Buckets **privados** (sem listagem pública).
- Signed URLs com TTL curto; sem ACL `public-read` por default.
- Sanitizar `filename` (já feito) e nunca usar o nome cru como key raiz.
- Em multi-tenant futuro: prefixo por `tenant_id` na key.

## Observabilidade

- Logar `driver`, `key` (não credenciais), `file_id`, latência de put/get/delete.
- Métricas: `files_put_total{driver}`, `files_put_errors_total`, bytes transferidos.
- Erros de provedor mapear para `STORAGE_ERROR` (502/503) vs `NOT_FOUND`.

## Fases de implementação

| Fase | Entrega |
|---|---|
| **0 (atual)** | Driver `local` only |
| **1** | Extrair interface + `local` atrás de `getStorageDriver()`; sem mudança de schema |
| **2** | Colunas `storage_driver` / `storage_key` + backfill |
| **3** | Driver `s3` (cobre MinIO) + env + testes de integração com LocalStack/MinIO |
| **4** | Drivers `gcs` e `azure` |
| **5** | `FILES_DOWNLOAD_MODE=redirect` + signed URLs |
| **6** | (Opcional) migração de blobs local → bucket (script offline) |

## Testes

- Unit: mock do driver; repository não chama `fs` direto.
- Integração: MinIO (S3), emulador Azurite (Azure), fake-gcs-server (GCS) — ou testes manuais documentados se CI não tiver os três.
- Contrato: upload → get metadados → download bytes iguais → delete → 404.

## Fora de escopo (v1 cloud)

- Multi-driver na mesma instância (arquivo A em S3, B em GCS).
- CDN na frente do bucket (CloudFront / Cloud CDN) — pode vir depois via signed URL.
- Criptografia client-side.
- Versionamento de objetos / lifecycle rules (configurar no provedor, não na API).

## Relação com módulos

Storage **não** precisa ser um `/modules/{name}`: é infraestrutura transversal, como o Postgres.  
Se no futuro o painel tiver UI de “armazenamento”, pode ler `FILES_DRIVER` (sem expor secrets) via endpoint admin de config.

## Referências internas

- Contrato HTTP: [files.md](./files.md)
- Implementação atual: `kunk-api/src/repositories/filesRepository.js`, `kunk-api/src/routes/files.js`
- Schema: `files` + `*_files` em [target-schema.sql](../../sql/target-schema.sql)
