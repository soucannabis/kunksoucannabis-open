---
id: configuracoes-armazenamento
title: Armazenamento de arquivos
section: configuracoes
adminPath: /armazenamento
keywords: [armazenamento, s3, gcs, bucket, storage, arquivos]
order: 51
---

## Para que serve

Define **onde os arquivos ficam guardados**: no servidor (local) ou em nuvem (Amazon S3 ou Google Cloud Storage).

## O que você configura

- Driver: local, S3 ou GCS
- Credenciais e nome do bucket (nuvem)
- Ativação do bucket após o teste de conexão

## Passo a passo (nuvem)

Siga o guia exibido na própria tela ao escolher S3 ou GCS. Em resumo:

1. Crie um bucket **privado** no provedor.
2. Gere chaves de acesso (S3) ou JSON de service account (GCS).
3. Preencha o formulário → **Testar e salvar** → **Ativar bucket**.

Documentação oficial:

- [AWS S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/GetStartedWithS3.html)
- [IAM Access Keys](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html)
- [Google Cloud Storage](https://cloud.google.com/storage/docs/creating-buckets)
- [Service accounts](https://cloud.google.com/iam/docs/service-account-overview)

## Quando usar

Em produção, recomenda-se nuvem para não perder arquivos se o servidor for recriado. Em desenvolvimento local, o driver local costuma bastar.
