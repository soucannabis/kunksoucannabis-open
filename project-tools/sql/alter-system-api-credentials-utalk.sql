-- Utalk (Umbler) — token único de acesso + metadados de instalação (idempotente)
-- Auth: um Bearer de qualquer usuário Utalk basta para chats/transfer (sem envio de mensagem).
INSERT INTO system_api_credentials (
  service, field_key, encrypted_value, env_fallback, is_secret, description
) VALUES
  (
    'utalk',
    'api_token',
    NULL,
    'UTALK_API_TOKEN',
    true,
    'Token de API Utalk (Bearer de qualquer usuário da org)'
  ),
  (
    'utalk',
    'organization_id',
    NULL,
    'UTALK_ORG_ID',
    false,
    'ID da organização Umbler Utalk'
  ),
  (
    'utalk',
    'from_phone',
    NULL,
    'UTALK_FROM_PHONE',
    false,
    'Telefone do canal WhatsApp no formato +55 e número completo (ex.: +5562999999999)'
  ),
  (
    'utalk',
    'api_base_url',
    NULL,
    'UTALK_API_URL',
    false,
    'Base URL da API Utalk (default https://app-utalk.umbler.com/api/v1)'
  )
ON CONFLICT (service, field_key) DO NOTHING;
