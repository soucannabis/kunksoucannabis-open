-- Pedidos SouCannabis credentials (idempotent)
INSERT INTO system_api_credentials (
  service, field_key, encrypted_value, env_fallback, is_secret, description
) VALUES
  ('soucannabis_orders', 'base_url', NULL, 'SOUCANNABIS_ORDERS_BASE_URL', false, 'Base URL do Kunk SouCannabis (sem /api/external)'),
  ('soucannabis_orders', 'client_id', NULL, 'SOUCANNABIS_ORDERS_CLIENT_ID', true, 'OAuth client_id inbound'),
  ('soucannabis_orders', 'client_secret', NULL, 'SOUCANNABIS_ORDERS_CLIENT_SECRET', true, 'OAuth client_secret inbound'),
  ('soucannabis_orders', 'token_url', NULL, 'SOUCANNABIS_ORDERS_TOKEN_URL', false, 'URL do token (default {base}/api/external/auth/token)'),
  ('soucannabis_orders_outbound', 'client_id', NULL, NULL, false, 'Client ID que a SC usa para chamar esta instalação'),
  ('soucannabis_orders_outbound', 'client_secret', NULL, NULL, true, 'Client secret outbound (gerado nesta instalação)'),
  ('soucannabis_orders_outbound', 'orders_path', NULL, NULL, false, 'Path de pedidos outbound')
ON CONFLICT (service, field_key) DO NOTHING;
