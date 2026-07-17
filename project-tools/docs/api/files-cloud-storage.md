# Storage em bucket

> **Status:** implementado (v1) — drivers `local`, `s3`, `gcs`.  
> Azure fica fora desta versão.  
> Setup: [storage-s3-setup.md](./storage-s3-setup.md) · [storage-gcs-setup.md](./storage-gcs-setup.md).  
> Contrato HTTP: [files.md](./files.md).

## Objetivo

Upload/download/delete de arquivos em object storage, com drivers:

| Provedor | Serviço | Driver id |
|---|---|---|
| (padrão) | Disco local | `local` |
| Amazon | S3 | `s3` |
| Google | Cloud Storage (GCS) | `gcs` |

A API pública (`POST/GET/DELETE /files`, `attach`) permanece igual. Só muda a camada de I/O do binário. Download é **sempre proxy** pela API (bucket privado + credenciais).

## Princípios

1. **Contrato HTTP estável** — clientes não escolhem o provedor.
2. **Driver pluggable** — interface única; driver ativo por instância para *novos* uploads.
3. **Metadados no Postgres** — `files` guarda `storage_driver` + `storage_key`.
4. **Segredos** — `system_api_credentials` (services `storage_s3` / `storage_gcs`) com cascade DB → env; nunca expostos na API admin além de “tem valor”.
5. **Default = `local`** — cloud é opt-in (Admin ou ENV).
6. **Lock** — após ativar cloud e migrar (ou sem pendências locais), não permite trocar provedor/bucket.
7. **Admin** — menu **Armazenamento** (`/armazenamento`), fora de Serviços externos.

## Modelo de dados

| Coluna | Tipo | Uso |
|---|---|---|
| `storage_driver` | `VARCHAR` | `local` \| `s3` \| `gcs` |
| `storage_key` | `TEXT` | Key no bucket ou path relativo local |
| `storage_path` | `TEXT` | Compat: path absoluto no local; em cloud espelha a key |

SQL: `project-tools/sql/alter-files-storage-driver.sql`.

## Código

```
kunk-api/src/storage/
  index.js          # getActiveStorageDriver / getDriverForFile
  resolveConfig.js  # system_configs + credentials + ENV
  local.js
  s3.js
  gcs.js
```

`filesRepository` e doc-sign usam o driver (não `fs` direto no path).

## Configuração

### `system_configs` (`system = 'storage'`)

| Key | Descrição |
|---|---|
| `driver` | `local` \| `s3` \| `gcs` (ENV: `FILES_DRIVER`) |
| `key_prefix` | Prefixo das keys (ENV: `FILES_KEY_PREFIX`, default `kunk/`) |
| `locked` | Travamento após ativar bucket na nuvem |
| `s3.bucket` / `s3.region` | Metadados S3 |
| `gcs.bucket` / `gcs.project_id` | Metadados GCS |

### Credenciais

| Service | Campos | ENV fallback |
|---|---|---|
| `storage_s3` | `access_key_id`, `secret_access_key` | `S3_*` |
| `storage_gcs` | `client_email`, `private_key`, `credentials_json` | `GCS_*` |

### Admin API (`Administrador`)

| Método | Path | Função |
|---|---|---|
| GET | `/admin/storage` | Status (sem secrets) |
| PUT | `/admin/storage` | Salvar config/credenciais |
| POST | `/admin/storage/test` | Testar acesso |
| POST | `/admin/storage/activate` | Ativar s3/gcs |

## Fluxos

### Upload

`multipart` → multer → `getActiveStorageDriver().put` → INSERT `files` → `url: /files/:id/download`.

### Download

Auth → `getDriverForFile(row).get` → stream na response (proxy).

## UX Admin

- Item de menu **Armazenamento**.
- Modal ao abrir o admin se `driver === local` (dismiss via `localStorage` key `kunk.admin.storage.prompt.dismissed`).
- Se cloud ativo, modal não aparece.

## Segurança

- Bucket privado; sem ACL pública.
- Auth + RBAC `files:*` no download (exceção: arquivo referenciado em `system_configs` não sensível — branding público para `<img>` no login).
- Credenciais criptografadas com `CONFIG_ENCRYPT_KEY`.

## Fora de escopo (v1)

- Azure Blob
- Multi-driver simultâneo para *novos* uploads (durante migração arquivos antigos ainda podem ser `local`)
- Redirect com signed URL / CDN
- Troca de bucket após lock
