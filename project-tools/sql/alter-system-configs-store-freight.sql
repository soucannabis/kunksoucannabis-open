-- system_configs: store freight / cart (Loja)
-- Idempotent — no operational hardcoded defaults (admin must fill)

INSERT INTO system_configs (
  system, key, value, value_type, is_sensitive, is_required, allow_hardcoded, hardcoded_default, description
) VALUES
  (
    'store',
    'store.freight.apply_to_total',
    'true',
    'boolean',
    false,
    true,
    false,
    NULL,
    'Aplicar valor do frete no total do carrinho'
  ),
  (
    'store',
    'store.ship_from',
    NULL,
    'json',
    false,
    true,
    false,
    NULL,
    'Remetente / quem envia os pedidos (obrigatório)'
  ),
  (
    'store',
    'store.freight.package',
    NULL,
    'json',
    false,
    true,
    false,
    NULL,
    'Dimensões e peso da caixa (obrigatório; sem default no código)'
  ),
  (
    'store',
    'store.freight.label_package',
    NULL,
    'json',
    false,
    false,
    false,
    NULL,
    'Override opcional de dims/peso só na geração de etiqueta'
  ),
  (
    'store',
    'store.freight.content_declaration',
    NULL,
    'json',
    false,
    true,
    false,
    NULL,
    'Declaração de conteúdo compartilhada (Loggi + Melhor Envio)'
  ),
  (
    'store',
    'store.freight.default_option',
    NULL,
    'json',
    false,
    false,
    false,
    NULL,
    'Favorito de entrega (provider > transportadora > modalidade)'
  ),
  (
    'store',
    'store.freight.loggi.external_service_ids',
    NULL,
    'json',
    false,
    false,
    false,
    NULL,
    'SISUs Loggi (homologação) enviados na cotação'
  ),
  (
    'store',
    'store.freight.melhorenvio.enabled_service_ids',
    NULL,
    'json',
    false,
    false,
    false,
    NULL,
    'IDs de serviço Melhor Envio a cotar; null = todos do catálogo'
  )
ON CONFLICT (system, key) DO NOTHING;
