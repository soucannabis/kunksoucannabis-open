# Files

Substitui `directus_files` + junctions. Tabela `files` no schema alvo + `orders_files`, `users_files`, `services_files`.

O blob pode estar em disco local, Amazon S3 ou Google Cloud Storage (ver [files-cloud-storage.md](./files-cloud-storage.md)). A URL lógica permanece `/api/v1/files/{id}/download` — a API faz proxy com as credenciais do bucket (bucket privado).

## Endpoints

### Upload

```http
POST /files
Content-Type: multipart/form-data
```

Campos:

| Campo | Obrigatório | Descrição |
|---|---|---|
| `file` | sim | binário |
| `filename` | não | override do nome |
| `folder` | não | pasta lógica (se houver) |

**201**

```json
{
  "data": {
    "id": "uuid",
    "filename": "receita.pdf",
    "mime_type": "application/pdf",
    "storage_path": "…",
    "created_at": "2026-07-10T12:00:00.000Z",
    "url": "/api/v1/files/{id}/download"
  },
  "meta": null,
  "errors": null
}
```

### Metadados

```http
GET /files/:id
```

### Download

```http
GET /files/:id/download
```

Retorna stream com `Content-Type` e `Content-Disposition` (`inline` para imagens/PDF).

Auth: operador (`files:read`), associado dono do arquivo, **ou** sem auth quando o `id` aparece no `value` de alguma `system_configs` não sensível (logo/fundo do Kunk e outros assets de branding públicos).

### Delete

```http
DELETE /files/:id
```

Remove metadados + objeto no storage (e limpa junctions, ou impede delete se referenciado).

### Anexar a entidade

```http
POST /files/:id/attach
```

```json
{
  "collection": "orders",
  "item_id": 123
}
```

Cria linha em `orders_files` / `users_files` / `services_files` conforme `collection`.

```http
DELETE /files/:id/attach
```

```json
{ "collection": "orders", "item_id": 123 }
```

### Listar anexos

```http
GET /items/orders/:id/files
```

ou

```http
GET /orders/:id/files
```

(definir um; preferir domínio se precisar de permissões específicas)

## Storage

**Hoje:** apenas disco local (`FILES_LOCAL_PATH`).

Configuração atual / proposta mínima:

| Env | Descrição |
|---|---|
| `FILES_DRIVER` | `local` (único implementado) |
| `FILES_LOCAL_PATH` | path local |

**Futuro (não implementado):** upload em bucket multi-cloud (Amazon S3, Google Cloud Storage, Azure Blob). Ver [files-cloud-storage.md](./files-cloud-storage.md).

## Segurança

- Validar MIME e tamanho máximo
- Nomes sanitizados
- Download só com auth + permissão na entidade pai
- Não servir path arbitrário do disco
