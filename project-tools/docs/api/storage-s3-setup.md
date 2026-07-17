# Configurar Amazon S3 (Armazenamento Kunk)

> O Kunk acessa o bucket **com Access Key / Secret Key**. O bucket deve permanecer **privado** — não é necessário ACL pública, policy de site estático nem “Block Public Access” desligado.

## Visão geral

1. Crie um bucket S3 privado.
2. Crie um usuário IAM com permissão só de objetos no bucket (ou prefixo).
3. Gere Access Key + Secret Key.
4. Informe no **Admin → Armazenamento** (ou nas variáveis de ambiente da API).

Downloads e uploads dos apps continuam em `/api/v1/files/:id/download` — a API faz proxy com as credenciais.

## 1. Criar o bucket

1. Console AWS → **S3** → **Create bucket**.
2. Nome único (ex.: `minha-instancia-kunk-files`).
3. Região (anote — ex.: `sa-east-1`).
4. **Block Public Access**: deixe **ativado** (recomendado).
5. Não habilite website hosting nem ACL `public-read`.

## 2. Política IAM (usuário da API)

Crie um usuário IAM (ou role) só para a API. Anexe uma policy no estilo:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "KunkObjects",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::SEU_BUCKET/kunk/*"
    },
    {
      "Sid": "KunkListHead",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:HeadBucket"
      ],
      "Resource": "arn:aws:s3:::SEU_BUCKET",
      "Condition": {
        "StringLike": {
          "s3:prefix": ["kunk/*", "_kunk_probe/*"]
        }
      }
    }
  ]
}
```

Ajuste `SEU_BUCKET` e o prefixo se mudar `FILES_KEY_PREFIX` (padrão `kunk/`).  
O teste de conexão da API grava/apaga um objeto em `_kunk_probe/` — inclua esse prefixo ou conceda `PutObject`/`DeleteObject` nele.

**Não** é necessário:

- tornar o bucket público;
- configurar CORS para os browsers dos apps (o tráfego de arquivo passa pela API);
- CloudFront (opcional, fora do escopo v1).

## 3. Access Key

1. IAM → usuário → **Security credentials** → **Create access key**.
2. Guarde `Access key ID` e `Secret access key`.

## 4. Configurar no Kunk

### Opção A — Admin

1. Entre como Administrador → **Armazenamento**.
2. Provedor: **Amazon S3**.
3. Preencha bucket, região, Access Key e Secret.
4. **Testar conexão** → **Ativar bucket**.

Após ativar, novos uploads vão para o bucket. Troca de provedor (S3↔GCS) só é permitida se ainda não houver arquivos na nuvem.

### Opção B — Ambiente (`.env` da `kunk-api`)

```env
FILES_DRIVER=s3
FILES_KEY_PREFIX=kunk/
S3_BUCKET=seu-bucket
S3_REGION=sa-east-1
S3_ACCESS_KEY_ID=AKIA...
S3_SECRET_ACCESS_KEY=...
```

Credenciais no banco (`system_api_credentials`, service `storage_s3`) têm precedência sobre o env quando preenchidas no Admin.

## 5. SQL de seed (primeira instalação)

```bash
psql "$DATABASE_URL" -f project-tools/sql/alter-files-storage-driver.sql
psql "$DATABASE_URL" -f project-tools/sql/alter-system-configs-storage.sql
psql "$DATABASE_URL" -f project-tools/sql/alter-system-api-credentials-storage.sql
```

## Referências

- [files-cloud-storage.md](./files-cloud-storage.md)
- [files.md](./files.md)
- Admin: `/armazenamento`
