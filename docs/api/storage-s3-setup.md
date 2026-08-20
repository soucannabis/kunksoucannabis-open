# Configurar Amazon S3 (Armazenamento Kunk)

> O Kunk acessa o bucket **com Access Key / Secret Key**. Use um bucket **exclusivo do Kunk**, **privado** — não é necessário ACL pública, policy de site estático nem “Block Public Access” desligado.

## Visão geral

1. Crie um bucket S3 **só para o Kunk** (privado).
2. Crie um usuário IAM com **acesso total a esse bucket**.
3. Gere Access Key + Secret Key.
4. Informe no **Admin → Armazenamento** (ou nas variáveis de ambiente da API).

Downloads e uploads dos apps continuam em `/api/v1/files/:id/download` — a API faz proxy com as credenciais.

## 1. Criar o bucket

1. Console AWS → **S3** → **Create bucket**.
2. Nome único **exclusivo do Kunk** (ex.: `minha-instancia-kunk-files`). Não compartilhe com outros projetos.
3. Região (anote — ex.: `sa-east-1`).
4. **Block Public Access**: deixe **ativado** (recomendado).
5. Não habilite website hosting nem ACL `public-read`.

Arquivos dos apps, pasta `backups/` e o probe `_kunk_probe/` ficam neste bucket.

## 2. Política IAM (usuário da API)

Crie um usuário IAM só para a API. Como o bucket é exclusivo, anexe acesso total a ele:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "KunkBucketFullAccess",
      "Effect": "Allow",
      "Action": ["s3:*"],
      "Resource": [
        "arn:aws:s3:::SEU_BUCKET",
        "arn:aws:s3:::SEU_BUCKET/*"
      ]
    }
  ]
}
```

Substitua `SEU_BUCKET` pelo nome real. Isso cobre uploads, downloads, listagem, backups e o **Testar e ativar**.

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
4. **Testar e ativar** (valida o bucket, salva credenciais e liga o módulo).

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

## 5. Schema e seed

Em instalação nova, o schema (incluindo storage) é aplicado via o assistente de instalação / `kunk-api/sql/target-schema.sql`. Credenciais e flags de storage também podem ser configuradas no Admin em `/armazenamento`.

## Referências

- [files-cloud-storage.md](./files-cloud-storage.md)
- [files.md](./files.md)
- Admin: `/armazenamento`
