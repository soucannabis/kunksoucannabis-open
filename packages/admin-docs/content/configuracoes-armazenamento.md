---
id: configuracoes-armazenamento
title: Armazenamento e Backup
section: configuracoes
adminPath: /armazenamento
keywords: [armazenamento, s3, gcs, bucket, storage, arquivos, backup, restore]
order: 50
---

## Para que serve

Define **onde os arquivos ficam guardados**: no servidor (local) ou em nuvem (Amazon S3 ou Google Cloud Storage), e configura **backups diários** do banco (SQL + JSON das tabelas) no mesmo bucket.

## O que você configura

- Driver: local, S3 ou GCS
- Credenciais e nome do bucket (nuvem)
- Ativação do bucket após o teste de conexão
- Migração da logo institucional (e fundo) do disco local para o bucket
- Backup: horário diário e execução manual (mantém os 10 últimos backups)
- Lista dos últimos backups (abrir no bucket, restaurar ou excluir)

## Passo a passo (nuvem)

Siga o guia exibido na própria tela ao escolher S3 ou GCS. Em resumo:

1. Crie um bucket **privado e exclusivo do Kunk** no provedor (não compartilhe com outros sistemas).
2. Gere chaves de acesso (S3) ou JSON de service account (GCS) com acesso a esse bucket.
3. Preencha o formulário → **Testar e ativar** (salva credenciais, ativa o bucket e liga o backup).

Ao **testar e ativar** com sucesso, o sistema:

- Cria a pasta `backups/` no bucket
- Liga o módulo de backup com opções padrão (22:00 America/Sao_Paulo, retenção 10)
- Libera a edição das configurações de backup
- Abre o **assistente da logo**: se a logo (ou imagem de fundo) ainda estiver no disco local, oferece enviar o arquivo para o bucket. A URL pública continua `/api/v1/files/{id}/download` — o blob passa a ser lido da nuvem.

Se você ativou o bucket antes e a logo ficou local, um aviso na própria página de armazenamento reabre o assistente.

Documentação oficial:

- [AWS S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/GetStartedWithS3.html)
- [IAM Access Keys](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html)
- [Google Cloud Storage](https://cloud.google.com/storage/docs/creating-buckets)
- [Service accounts](https://cloud.google.com/iam/docs/service-account-overview)

## Backups

Cada backup gera no prefixo `backups/AAAA-MM-DD_HHMMSS/`:

- `database.sql` — dump completo (usado no restore)
- `tables/<tabela>.json` — um JSON por tabela `public` (linhas + metadados)
- `manifest.json` — metadados (lista de tabelas e tamanhos)

**Abrir no bucket** abre o console do provedor (S3 ou GCS) na pasta daquele backup (é preciso estar logado na conta cloud).

**Restaurar** aplica o SQL sobre o banco atual (destrutivo). Confirme digitando `RESTAURAR` na tela. O JSON não é reaplicado no restore.

Backups só ficam disponíveis com o bucket **autenticado e ativo**.

## Quando usar

Em produção, recomenda-se nuvem para não perder arquivos se o servidor for recriado, e backups diários no mesmo bucket.
