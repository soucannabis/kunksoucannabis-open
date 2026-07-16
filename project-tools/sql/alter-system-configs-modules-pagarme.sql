-- system_configs: Pagar.me flags (idempotent)
INSERT INTO system_configs (
  system, key, value, value_type, is_sensitive, is_required, allow_hardcoded, hardcoded_default, description
) VALUES
  ('modules', 'modules.pagarme.enabled', 'false', 'boolean', false, false, false, NULL, 'Módulo Pagar.me habilitado'),
  ('modules', 'modules.pagarme.use_for_orders', 'true', 'boolean', false, false, false, NULL, 'PaymentModal em pedidos'),
  ('modules', 'modules.pagarme.use_for_services', 'true', 'boolean', false, false, false, NULL, 'PaymentModal em serviços'),
  ('modules', 'modules.pagarme.success_url', NULL, 'string', false, false, false, NULL, 'URL de sucesso do checkout'),
  ('modules', 'modules.pagarme.card_fee_percent', '5', 'number', false, false, false, NULL, 'Acréscimo percentual no cartão'),
  ('modules', 'modules.pagarme.checkout_expires_in', '10080', 'number', false, false, false, NULL, 'Expiração do checkout em minutos'),
  ('modules', 'modules.pagarme.association_recipient_id', NULL, 'string', false, false, false, NULL, 'Recipient Pagarme da associação (rp_…)'),
  ('modules', 'modules.pagarme.soucannabis_recipient_id', NULL, 'string', false, false, false, NULL, 'Recipient Pagarme SouCannabis (rp_…)')
ON CONFLICT (system, key) DO NOTHING;
