-- system_configs: status de pedidos (store.order_statuses)
-- Idempotent. Defaults: Aguardando pagamento / Pagamento concluído (system).

INSERT INTO system_configs (
  system, key, value, value_type, is_sensitive, is_required, allow_hardcoded, hardcoded_default, description
) VALUES
  (
    'store',
    'store.order_statuses',
    NULL,
    'json',
    false,
    false,
    true,
    '[{"id":"awaiting_payment","value":"Aguardando pagamento","label":"Aguardando pagamento","order":1,"system":true,"is_awaiting":true,"color":"#c9a227"},{"id":"payment_done","value":"Pagamento concluído","label":"Pagamento concluído","order":2,"system":true,"is_paid":true,"color":"#2e7d32"}]',
    'Status configuráveis de pedidos (toggle pagamento + bulk)'
  )
ON CONFLICT (system, key) DO NOTHING;

UPDATE system_configs
SET
  hardcoded_default = COALESCE(
    hardcoded_default,
    '[{"id":"awaiting_payment","value":"Aguardando pagamento","label":"Aguardando pagamento","order":1,"system":true,"is_awaiting":true,"color":"#c9a227"},{"id":"payment_done","value":"Pagamento concluído","label":"Pagamento concluído","order":2,"system":true,"is_paid":true,"color":"#2e7d32"}]'
  ),
  description = COALESCE(description, 'Status configuráveis de pedidos (toggle pagamento + bulk)'),
  value_type = 'json',
  allow_hardcoded = true
WHERE system = 'store' AND key = 'store.order_statuses';
