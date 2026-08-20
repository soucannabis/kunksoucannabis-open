# Configurar Google Cloud Storage (Armazenamento Kunk)

> O Kunk acessa o bucket **com uma service account** (arquivo JSON). Use um bucket **exclusivo do Kunk**, **privado** — não é necessário tornar objetos públicos nem configurar “allUsers”.

## Visão geral

1. Crie um bucket GCS **só para o Kunk** (privado).
2. Crie uma service account e conceda no bucket os papéis **Administrador de objetos do Storage** + **Administrador do Storage**.
3. Baixe a chave JSON.
4. No **Admin → Armazenamento**, informe o bucket e faça upload do JSON.

O Admin **não grava o arquivo**. Extrai `client_email`, `private_key` e `project_id`, testa a conexão (upload/download/delete de um probe) e, se OK, salva só essas credenciais.

Downloads e uploads dos apps continuam em `/api/v1/files/:id/download` — a API faz proxy com as credenciais.

## 1. Criar o bucket

1. Console GCP → **Cloud Storage** → **Buckets** → **Create**.
2. Nome único **exclusivo do Kunk** (ex.: `minha-instancia-kunk-files`). Não compartilhe com outros projetos.
3. Localização (anote o projeto GCP).
4. Controle de acesso: **Uniform** (recomendado).
5. **Public access prevention**: mantenha **enforced** / sem acesso público.

## 2. Service account

### 2.1 Criar a conta

1. **IAM e administrador** → **Contas de serviço** → **Criar conta de serviço**.
2. Nome sugestivo: `kunk-files`.
3. Na etapa de papéis do projeto, pode pular (**Concluir**) — as permissões serão dadas no bucket.
4. Anote o e-mail gerado (ex.: `kunk-files@seu-projeto.iam.gserviceaccount.com`).

### 2.2 Dar permissões no bucket

No bucket → aba **Permissões** → seção **Permissões** → **Conceder acesso** (ou **Adicionar principal**):

1. **Novos principais**: e-mail da service account.
2. **Papéis** — adicione os **dois**:

| Papel | Uso |
|---|---|
| **Administrador de objetos do Storage** (`roles/storage.objectAdmin`) | put / get / delete de objetos (uso diário do Kunk) |
| **Administrador do Storage** (`roles/storage.admin`) | libera `storage.buckets.get`, exigido pelo teste de conexão do Admin |

3. **Salvar**.

> Sem o papel **Administrador do Storage**, o teste falha com `storage.buckets.get denied`, mesmo com Object Admin — o teste verifica a existência do bucket antes de enviar o arquivo probe.

Se o botão não aparecer na aba do bucket, use **IAM e administrador** → **IAM** → **Conceder acesso** (aplica ao projeto inteiro, efeito equivalente).

O teste de conexão da API grava/apaga um objeto em `_kunk_probe/`.

**Não** é necessário:

- `allUsers` / `allAuthenticatedUsers` com `objectViewer`;
- CORS no bucket para os browsers (proxy via API);
- signed URL pública (v1 usa proxy).

## 3. Chave da service account

1. Service account → **Keys** → **Add key** → **JSON**.
2. No Admin → **Armazenamento** → provedor GCS → informe o **bucket** → envie o arquivo JSON.
3. O sistema testa automaticamente; se OK, as credenciais ficam salvas (máscara `••••••••`).

## 4. Ambiente (opcional)

Alternativa sem UI (API / `.env`):

```env
FILES_DRIVER=gcs
FILES_KEY_PREFIX=kunk/
GCS_BUCKET=seu-bucket
GCS_PROJECT_ID=seu-projeto-gcp
GCS_CLIENT_EMAIL=kunk-files@seu-projeto.iam.gserviceaccount.com
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## 5. Schema e seed

Em instalação nova, o schema (incluindo storage) é aplicado via o assistente de instalação / `kunk-api/sql/target-schema.sql`. Credenciais e flags de storage também podem ser configuradas no Admin em `/armazenamento`.

## Referências

- [files-cloud-storage.md](./files-cloud-storage.md)
- [storage-s3-setup.md](./storage-s3-setup.md)
- [files.md](./files.md)
- Admin: `/armazenamento`
