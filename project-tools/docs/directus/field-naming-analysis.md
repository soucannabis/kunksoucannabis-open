# Análise semântica de nomes de campos

> Avaliação de se os nomes das collections no escopo **correspondem ao que o campo realmente armazena**,
> com base no uso em `src/` e `kunkserver/`.
>
> Complementa [incorrect-english-fields.md](./incorrect-english-fields.md) (ortografia / inglês).
> Este arquivo trata de **assertividade semântica**: nome genérico, opaco, enganoso ou desalinhado ao domínio.

Critérios:

| Veredito | Significado |
|---|---|
| **manter** | Nome já comunica bem o papel |
| **renomear** | Nome fraco ou enganoso; sugestão justificada |
| **confirmar** | Sem evidência suficiente no código; amostrar dados no banco antes de decidir |
| **candidato a remover** | Pouco ou nenhum uso no OSS; avaliar drop na migração |

---

## Resumo executivo

| Área | Achado principal |
|---|---|
| Opacos com uso claro | `at*` (hipótese atendente), `log`, `user_path`, `session` (Tags), `code` vs `order_code`/`service_code`, `in_production`, `reason_treatment` |
| Nomes que mentem / enganam | `Tags.session` (= contextos de UI, não sessão de login), `Users.log` (= erros de formulário), `birthday*` (= data de nascimento), `unity` (= unit), `donate` (= donation) |
| Colisões de significado | `code` em Orders/services ≠ UUID interno; `partner` vs `partner_code`; `validation` = contestação de comissão |
| Legado sem uso no OSS | `Orders.at/at2/at3`, `message_check`, `institution`, `cancel_info`, `Products.amount`, vários `*_finders` / `app_user` / `bkp` |

**Prioridade de rename na migração**

1. Typos + palavra errada (ver inventário de inglês)
2. Nomes semanticamente enganosos com evidência forte (tabela abaixo “Alto”)
3. Padronização (`associate_*`, `*_code`, snake_case)
4. Confirmar no banco → dropar ou renomear campos sem evidência

---

## Prioridade alta (renomear com evidência)

| Collection | Campo | Significado real (código) | Sugestão | Por quê |
|---|---|---|---|---|
| `Tags` | `session` | Lista CSV de **onde a tag vale**: `reception`, `orders`, `services` | `contexts` ou `scopes` | **Session** sugere login; o campo é escopo de aplicação |
| `Users` | `log` | JSON de **erros de campos vazios** no cadastro (tooltip de status) | `form_error_log` | **Log** genérico; não é audit trail |
| `Users` | `user_path` | ID da pasta de documentos (Drive/storage) | `documents_folder_id` | **Path** sugere filesystem path genérico |
| `Partners` | `user_path` | Mesmo padrão (pasta de docs) | `documents_folder_id` | Idem |
| `Users` | `reason_treatment` | Códigos **CIAP-2** (motivo clínico estruturado) | `ciap_codes` | Nome atual não diz que é CIAP |
| `Users` | `products` | Preferência/lista de produtos do associado | `preferred_products` | **Products** sugere estoque/entidade, não preferência |
| `Orders` | `info` | Notas livres do pedido (dispensação/produção) | `order_notes` | Colide semanticamente com `details`; **info** vago |
| `Orders` | `code` | Código externo de entrega/transportadora (≠ `order_code` UUID) | `carrier_order_code` ou `shipping_external_code` | **Code** genérico com dois “códigos” na mesma tabela |
| `Orders` | `in_production` | Quem produz / estado (`nome` ou `"Finalizado"`) | `production_owner` (se pessoa) ou `production_state` | Nome parece boolean; na prática é string de responsável/estado |
| `Orders` | `kunk_user` | `user_code` do operador interno que criou/atendeu | `created_by_user_code` ou `attendant_user_code` | Sem o papel (criador/atendente) |
| `services` | `kunk_user` | Idem para serviço | `created_by_user_code` | Idem |
| `services` | `code` | Código do **grupo de agendamento** (vários profissionais); ≠ `service_code` | `booking_group_code` | Dois “code” na mesma tabela |
| `services` | `donate` | Valor monetário de doação | `donation` | Verbo; alinhar a `Orders.donation` |
| `Orders` / `services` | `validation` | Status de contestação/aprovação no relatório de comissão | `commission_validation` | **Validation** genérico (não é validação de endereço) |
| `Coupons` | `cod` | Código legível do cupom | `code` | Abreviação; alinhar ao restante |
| `Coupons` | `type_order` / `type_service` | Tipo de desconto (`money` / `percentage`) | `order_discount_type` / `service_discount_type` | **Type** sem dizer que é tipo de desconto |
| `Coupons` | `usage_info` | Histórico de usos do cupom | `usage_history` | **Info** ≠ histórico |
| `Coupons` | `name_info` | Nome/rótulo usado para gerar/exibir o cupom | `display_name` | Mais assertivo |
| `Products` | `cod` | SKU/código do produto | `sku` ou `code` | Abreviação; `sku` se for identificador comercial |
| `Products` | `unity` | Unidade de medida | `unit` | Inglês errado + sentido |
| `Partners` | `transactions` | Histórico JSON de comissões | `commission_transactions` | **Transactions** genérico demais |
| `Partners` / `Professionals` | `info_report` | Array de **contestações** de relatório | `contest_reports` | Nome não diz “contestação” |
| `Professionals` | `services` | Texto livre do que o profissional oferece | `services_description` | Colide com a collection `services` |
| `Reception` | `action` | Motivo do fechamento da triagem (`Pedido`, `Serviço`, `Agendamento`) | `completion_reason` | **Action** vago |
| `reports` | `obj_query` | Config do query builder | `query_config` | Abreviação + ordem |
| `reports` | `chart_obj` | Config visual do gráfico | `chart_config` | Idem |
| `reports` | `field_maps` | Colunas visíveis por tabela | `column_maps` | **Field** ambíguo (campo vs coluna de UI) |
| `reports` | `queries` | SQL/blocos do dashboard (legado) | `dashboard_queries` | Escopo |
| `reports` | `reports` | Lista de `report_code` embutidos no dashboard | `embedded_report_codes` | Nome = nome da tabela |
| `reports` | `positions` | Layout grid do dashboard | `layout_positions` | Mais preciso |

---

## Prioridade média (melhorar assertividade / padronizar)

| Collection | Campo | Significado | Sugestão | Nota |
|---|---|---|---|---|
| `Orders` | `payment_form` | Forma/meio de pagamento | `payment_method` | Idioma de domínio |
| `Orders` | `delivery_text` | Observações de entrega | `delivery_notes` | Alinhar a “notes” |
| `Orders` | `msg_whatsapp` | Mensagem WhatsApp | `whatsapp_message` | Expandir abreviação |
| `Orders` / `services` | `survey_msg` | Mensagem de survey (se mantido) | `survey_message` | Expandir |
| `Orders` | `name_associate` | Nome do associado no pedido | `associate_name` | Padronizar com Reception/services |
| `Orders` | `partner` | Código do parceiro (logical link) | `partner_code` **ou** unificar com o campo `partner_code` existente | Hoje há `partner` e `partner_code` — decidir um |
| `Users` | `name_associate` … `rg_associate` | Dados do associado | `associate_name`, `associate_last_name`, `associate_cpf`, `associate_rg`, `associate_rg_issuer`, `associate_birth_date` | Um único prefixo `associate_*` |
| `Users` | `secundary_number` | Telefone secundário | `secondary_phone` | Typo + semântica (é telefone) |
| `Users` | `number` | Número do endereço | `street_number` | **Number** sozinho colide com telefones/outros |
| `Users` | `pass_account` | Senha da conta | `account_password` | |
| `Users` / `Partners` / `Kunk_Users` | `birthday*` / `birthday` | Data de nascimento | `birth_date` / `associate_birth_date` | |
| `Users` | `responsable_type` / `responsable_code` | Tipo/código do responsável | `responsible_type` / `responsible_code` | Typo |
| `Users` | `responsible_for` | `user_code` do paciente (quando registro é responsável) | **manter** ou `patient_user_code` | Já razoável; alternativa mais explícita |
| `Users` | `anotations` | Anotações | `annotations` | Typo |
| `Users` | `handbook` | Prontuário JSON `{annotations, fields}` | **manter** ou `clinical_handbook` | Domínio já usa “handbook” |
| `Users` | `address_delivery` | Endereço de entrega JSON | **manter** ou `delivery_address` | Ordem EN mais natural |
| `Kunk_Users` | `pass` | Senha | `password` | |
| `Kunk_Users` | `number_street` | Número do endereço | `street_number` | |
| `Kunk_Users` | `n_council` | Número do conselho (CRM etc.) | `council_number` | |
| `Kunk_Users` / `Partners` | `associates` | Lista textual de `user_code` | `associate_codes` | Deixa claro o conteúdo |
| `Partners` | `is_collaborator` | Na UI de parceiros = **favorito/destaque** | `is_favorite` | Em Partners o sentido ≠ “colaborador” |
| `Professionals` | `is_collaborator` | Aparece na agenda de serviços | **manter** ou `show_in_services` | Sentido diferente de Partners — não unificar cegamente |
| `Professionals` / `Reception` | `lastname` | Sobrenome | `last_name` | |
| `Professionals` | `met_us` | Como chegou (`direta`/`indireta`/texto) | **manter** ou `acquisition_channel` | Curto mas idiomático no produto |
| `Professionals` | `fingerprint` | FingerprintJS visitor id | **manter** ou `device_fingerprint` | |
| `Reception` | `isAssociate` | Flag associado cadastrado | `is_associate` | Casing |
| `Reception` | `chatId` | ID do chat | `chat_id` | Casing |
| `Reception` | `fullname` | Nome completo | `full_name` | |
| `Reception` | `option1` | Texto de formulário/triagem | `intake_option_1` ou `form_note_1` | Ainda fraco; confirmar conteúdo nos dados |
| `services` | `professional` / `associate` | Referências textuais (sem FK) | `professional_ref` / `associate_user_code` (após modelo de FK) | Na migração viram FKs reais |

---

## Manter (já assertivos ou domínio claro)

| Collection | Campos |
|---|---|
| `Orders` | `status`, `total`, `tracking_code`, `order_code`, `user_code`, `items`, `discount`, `details`, `donation`, `carrier`, `payment_link`, `payment_date`, `tags`, `address`, `address_validation`, `delivery_problem`, `no_commission`, `documents`, `custom_payment` |
| `Users` | `status`, `associate_status`, `email`, `mobile_number`, `user_code`, `adhesion_term`, `reason_treatment_text`, `session_*`, `gdrive_link`, `prescriber_code` |
| `Products` | `batch`, `concentration`, `name`, `price`, `type`, `category`, `status` |
| `services` | `status`, `price`, `price_paid`, `observations`, `service_code`, `payment_type`, `event_link`, `event_id` |
| `Reception` | `attendant`, `tags`, `associate_code`, `associate_name`, `patient_name` |
| `Kunk_Users` | `permissions`, `utalk_id`, `user_code`, `session_*` |
| `Coupons` | `usage_limit`, `usage_type`, `discount_order`, `discount_service` |
| `Professionals` | `donation_balance`, `professional_code`, `specialty`, `type` |
| `reports` | `favorites`, `sql_query`, `report_code` |
| Junctions `*_files` | Papel claro; só padronizar casing de tabela na migração |

---

## Confirmar no banco / sem evidência suficiente no OSS

Amostrar valores reais antes de renomear ou dropar.

| Collection.campo | Hipótese | Ação sugerida |
|---|---|---|
| `Orders.at`, `at2`, `at3` | Atendente(s) histórico(s) | Se populados → `attendant` / `attendant_2` / `attendant_3`; se vazios → dropar |
| `Users.at`, `services.at`, `services.at3`, `Professionals.at` | Idem | Idem |
| `Orders.message_check` | Mensagem de checagem (só label UI) | Confirmar ou dropar |
| `Orders.institution` | Instituição | Confirmar ou dropar |
| `Orders.cancel_info` | Motivo/info de cancelamento | Se usado → `cancel_reason` |
| `Orders.batch` | Lote no pedido (lote real está em `items[].batch`) | Provável legado; dropar se vazio |
| `Orders.survey_msg`, `services.survey_msg` | Mensagem pós-pesquisa | Confirmar |
| `Users.active_order`, `active_service` | Cache de pedido/serviço ativo? | Confirmar ou dropar |
| `Users.bkp` | Backup/referência | Confirmar ou dropar |
| `Users.met_us` | Canal de aquisição (em Professionals há write) | Confirmar write em Users |
| `services.info`, `services.message` | Notas / mensagem | Confirmar; se notas → `service_notes` |
| `Coupons.created_in`, `app_user` | Origem / usuário app | Fora do API atual de cupons; confirmar |
| `Partners.partners_finders`, `code_finder`, `finder_name` | Rede de indicadora | Confirmar; se morto → dropar |
| `Professionals.finder_name`, `app_user` | — | Confirmar ou dropar |
| `Products.amount` | Não usado na UI de Products; em **items** de pedido = preço unitário | Não confundir: se dropar de Products, items usam outro shape |
| `Reception.option2` | Segunda opção de form | Confirmar |
| `Kunk_Users.type`, `transactions`, `pipefy_id` | Tipo, comissões, Pipefy | Confirmar |
| `reports.details_query` | Sem referência no código | Confirmar ou dropar |

---

## Colisões e ambiguidades entre campos

Problemas estruturais de nomenclatura (não só typo):

1. **Dois “códigos” na mesma entidade**
   - `Orders.order_code` (UUID interno) vs `Orders.code` (código transportadora/externo)
   - `services.service_code` (UUID) vs `services.code` (grupo de agendamento)
   - Na migração: nomes distintos obrigatórios (`*_uuid` interno vs `*_external_code` / `booking_group_code`).

2. **`partner` vs `partner_code`**
   - Em `Orders` e `Users` existem ambos (string). Logical link aponta `partner` → `Partners.user_code`.
   - Decisão: um campo canônico + FK; evitar duplicata semântica.

3. **`validation` vs `address_validation`**
   - `validation` = comissão/relatório; `address_validation` = endereço.
   - Rename de `validation` evita confusão.

4. **`info` vs `details` vs `observations` vs `message`**
   - Família de “texto livre” com nomes aleatórios entre tabelas.
   - Convenção sugerida: `*_notes` para notas operacionais; `details` só se for resumo estruturado/exibição.

5. **`is_collaborator` em Partners ≠ Professionals**
   - Mesmo nome, papéis distintos no produto. Renomear no lado Partners (`is_favorite`) evita bug conceitual na API unificada.

6. **`Users.status` (texto) vs `Users.associate_status` (número)**
   - Manter ambos, mas documentar o enum numérico na docs de domínio; não reinventar o nome até mapear valores.

---

## Convenções recomendadas para o novo schema

Aplicar de forma consistente no PostgreSQL open source:

| Tema | Convenção |
|---|---|
| Case | `snake_case` exclusivo |
| Pessoa associada | Prefixo `associate_*` |
| IDs públicos UUID | `*_code` (ex.: `user_code`, `order_code`) |
| FKs inteiras | `*_id` apontando PK real |
| Referências ainda texto (legado) | Evitar; migrar para FK |
| Dinheiro | `donation`, `price`, `discount_*` (substantivos) |
| Flags | `is_*` / `has_*` / `no_*` boolean |
| JSON de histórico | `*_history` / `*_transactions` |
| Config UI | `*_config` / `*_maps` |
| Pastas/arquivos externos | `*_folder_id`, `*_file_id` |
| Integrações | Prefixo do provedor: `pipefy_*`, `beeviral_*`, `pagarme_*`, `melhorenvio_*` |

---

## Por collection — mapa rápido

### Coupons
- Renomear: `cod`→`code`, `name_info`→`display_name`, `usage_info`→`usage_history`, `type_order`/`type_service`→`*_discount_type`, `name_user`→`user_name`
- Confirmar: `created_in`, `app_user`
- Manter: `usage_limit`, `usage_type`, descontos, `product` (até virar FK)

### Kunk_Users
- Renomear: `pass`→`password`, `number_street`→`street_number`, `n_council`→`council_number`, `associates`→`associate_codes`, `birthday`→`birth_date`
- Confirmar: `type`, `transactions`, `pipefy_id`
- Manter: `permissions`, `utalk_*`, sessões

### Orders
- Renomear: ver tabela alta (`info`, `code`, `in_production`, `kunk_user`, `validation`, `payment_form`, `delivery_text`, `msg_whatsapp`, `name_associate`)
- Unificar: `partner` / `partner_code`
- Confirmar/dropar: `at*`, `message_check`, `institution`, `cancel_info`, `batch`, `survey_msg`

### Partners
- Renomear: `transactions`→`commission_transactions`, `info_report`→`contest_reports`, `pass_account`→`account_password`, `is_collaborator`→`is_favorite`, `user_path`→`documents_folder_id`, `associates`→`associate_codes`
- Confirmar/dropar: `partners_finders`, `code_finder`, `finder_name`

### Products
- Renomear: `cod`→`sku`/`code`, `unity`→`unit`
- Confirmar/dropar: `amount` na collection
- Manter: `batch`, `concentration`, `type`, `category`

### Professionals
- Renomear: `services`→`services_description`, `lastname`→`last_name`, `info_report`→`contest_reports`
- Confirmar: `at`, `finder_name`, `app_user`
- Cuidado: não copiar rename de `is_collaborator` de Partners

### Reception
- Renomear: `action`→`completion_reason`, casing `isAssociate`/`chatId`/`fullname`/`lastname`
- Confirmar: `option1`, `option2`

### reports
- Renomear bloco de config (`obj_query`, `chart_obj`, `field_maps`, `queries`, `reports`, `positions`)
- Confirmar: `details_query`
- Manter: `favorites`, `sql_query`

### services
- Renomear: `donate`→`donation`, `code`→`booking_group_code`, `kunk_user`, `validation`
- Confirmar: `at`, `at3`, `info`, `message`, `survey_msg`

### Tags
- Renomear: `session`→`contexts`

### Users
- Renomear typos + semântica alta (`log`, `user_path`, `reason_treatment`, `products`, bloco `*_associate`, senhas, telefones)
- Confirmar: `at`, `active_*`, `bkp`, `met_us`
- Manter: `responsible_for`, `address_delivery`, sessões, documentos-chave

### Users_Api / `*_files`
- Nomes OK; padronizar só nome de tabela

---

## Relação com outros docs

| Doc | Papel |
|---|---|
| [incorrect-english-fields.md](./incorrect-english-fields.md) | Ortografia, ordem PT→EN, casing |
| [logical-links.md](./logical-links.md) | Vínculos sem FK a materializar |
| [relations.md](./relations.md) | FKs oficiais Directus |
| Este arquivo | Nome ↔ significado real + sugestões assertivas |
| [field-rename-map.json](./field-rename-map.json) | Mapa oficial `old → new` (aprovados); ver [field-rename-map.md](./field-rename-map.md) |

Próximo passo: revisar `deferred` no JSON, marcar `status: "approved"` e gerar migrations a partir do `lookup`.