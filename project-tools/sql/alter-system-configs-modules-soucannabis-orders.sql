-- system_configs: Pedidos SouCannabis flags (idempotent)
INSERT INTO system_configs (
  system, key, value, value_type, is_sensitive, is_required, allow_hardcoded, hardcoded_default, description
) VALUES
  ('modules', 'modules.soucannabis_orders.enabled', 'false', 'boolean', false, false, false, NULL, 'Módulo Pedidos SouCannabis'),
  ('modules', 'modules.soucannabis_orders.sync_products', 'true', 'boolean', false, false, false, NULL, 'Catálogo remoto no carrinho'),
  ('modules', 'modules.soucannabis_orders.sync_tags', 'true', 'boolean', false, false, false, NULL, 'Tags SouCannabis na UI'),
  ('modules', 'modules.soucannabis_orders.sync_orders', 'true', 'boolean', false, false, false, NULL, 'Sync bidirecional de pedidos'),
  ('modules', 'modules.soucannabis_orders.payment_percentage', NULL, 'number', false, false, false, NULL, 'Cache payment_percentage de /me (inteiro)'),
  ('modules', 'modules.soucannabis_orders.remote_app_id', NULL, 'string', false, false, false, NULL, 'Cache me.id da app SC'),
  ('modules', 'modules.soucannabis_orders.last_me_at', NULL, 'string', false, false, false, NULL, 'ISO do último GET /me')
ON CONFLICT (system, key) DO NOTHING;
