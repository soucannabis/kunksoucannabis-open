/**
 * Guias de armazenamento (S3 / GCS) compartilhados com a página Armazenamento.
 * Passos em Markdown.
 */
export const STORAGE_SETUP_GUIDES = {
  s3: {
    title: 'Como obter as credenciais (Amazon S3)',
    steps: [
      'No [Console AWS → S3](https://console.aws.amazon.com/s3/), crie um bucket **privado** (Block Public Access ativado). Anote o nome e a região (ex.: `sa-east-1`).',
      'No [IAM](https://console.aws.amazon.com/iam/), crie um usuário (ou role) só para a API e anexe uma policy com `s3:PutObject`, `GetObject`, `DeleteObject` no prefixo do bucket (ex.: `kunk/*`) e `s3:ListBucket` / `HeadBucket` no bucket — inclua também `_kunk_probe/*` para o teste de conexão.',
      'Em IAM → usuário → **Security credentials** → **Create access key**. Guarde o **Access Key ID** e o **Secret Access Key**.',
      'Nesta página, selecione **Amazon S3**, preencha bucket, região, Access Key e Secret. Clique em **Testar e salvar** e depois em **Ativar bucket**.',
    ],
    docs: [
      {
        label: 'AWS S3',
        href: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/GetStartedWithS3.html',
      },
      {
        label: 'IAM Access Keys',
        href: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html',
      },
    ],
  },
  gcs: {
    title: 'Como obter as credenciais (Google Cloud Storage)',
    steps: [
      'No [Console GCP → Cloud Storage](https://console.cloud.google.com/storage), crie um bucket **privado** (Uniform access; Public access prevention enforced).',
      'Em [IAM → Contas de serviço](https://console.cloud.google.com/iam-admin/serviceaccounts), crie uma service account (ex.: `kunk-files`). No bucket → **Permissões**, conceda a essa conta os papéis **Administrador de objetos do Storage** e **Administrador do Storage** (o segundo é necessário para o teste de conexão).',
      'Na service account → **Keys** → **Add key** → **JSON**. Baixe o arquivo (contém `client_email`, `private_key` e `project_id`).',
      'Nesta página, selecione **Google Cloud Storage**, informe o nome do bucket e clique em **Enviar arquivo JSON**. O Admin não grava o arquivo: extrai as credenciais, testa (upload/download/delete de um probe) e, se OK, salva. Depois use **Ativar bucket**.',
    ],
    docs: [
      {
        label: 'Cloud Storage',
        href: 'https://cloud.google.com/storage/docs/creating-buckets',
      },
      {
        label: 'Service accounts',
        href: 'https://cloud.google.com/iam/docs/service-account-overview',
      },
    ],
  },
};
