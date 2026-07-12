# Clientes institucionais — Campos

## Tabela `institutional_clients`

| Grupo | Campo | Obrigatório | Notas |
|---|---|---|---|
| Identidade | `id`, `client_code` (UUID) | sim | Código público na URL (`?ic=`) |
| | `status` | sim | `active` / `inactive` |
| | `annotations` | não | JSON array (como associados) |
| Tipo | `is_company` | sim | boolean |
| Empresa | `company_name`, `company_cnpj` | se empresa | CNPJ 14 dígitos válido |
| | `company_trade_name`, `company_email`, `company_phone` | não | Preferidos na etiqueta se preenchidos |
| Representante | `representative_name`, `representative_cpf` | sempre | CPF 11 dígitos válido |
| | `representative_last_name`, `representative_email`, `representative_mobile` | e-mail/tel (tel ≥10) | Contato fallback |
| Endereço | `street`, `cep` | sim | Cotação/etiqueta |
| | `street_number`, `complement`, `neighborhood`, `city`, `state`, `delivery_address` | não | |

## Pedidos (`orders`)

| Campo | Uso |
|---|---|
| `institutional_client_id` | FK → `institutional_clients.id` |
| `institutional_client_code` | Snapshot do `client_code` |
| `associate_name` | Nome da empresa **ou** nome completo do representante |
| `receiver_name` | Nome do representante |
| `"user"` / `user_code` | Nulos quando o pedido é institucional |

XOR: associado **ou** institucional (nunca ambos).

## Etiqueta (Loggi / Melhor Envio)

| Dado | Empresa | Pessoa |
|---|---|---|
| Nome | `company_name` | representante |
| Documento | CNPJ | CPF do representante |
| Telefone / e-mail | company_* com fallback no representante | representante |
