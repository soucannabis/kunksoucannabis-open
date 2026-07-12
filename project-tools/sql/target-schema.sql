-- Schema alvo Kunk open source (PostgreSQL)
-- Gerado/ajustado para importação: ordem de FKs corrigida; coluna "user" entre aspas.
-- Não executar em produção sem revisão.

-- Substitui directus_files no produto unificado
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY,
  filename VARCHAR(512),
  mime_type VARCHAR(128),
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users → users (antes de orders por causa da FK)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  status VARCHAR(255),
  sort INTEGER,
  date_created TIMESTAMPTZ,
  date_updated TIMESTAMPTZ,
  associate_name VARCHAR(255),
  associate_last_name VARCHAR(255),
  gender VARCHAR(255),
  nationality VARCHAR(255),
  associate_rg_issuer VARCHAR(255),
  marital_status VARCHAR(255),
  email VARCHAR(255),
  street VARCHAR(255),
  street_number VARCHAR(255),
  complement VARCHAR(255),
  neighborhood VARCHAR(255),
  proof_of_address VARCHAR(255),
  reason_treatment_text TEXT,
  responsible_type VARCHAR(255),
  city VARCHAR(255),
  state VARCHAR(255),
  cep VARCHAR(255),
  email_account VARCHAR(255),
  account_password VARCHAR(255),
  user_code UUID UNIQUE,
  rg_proof VARCHAR(255),
  associate_cpf VARCHAR(255),
  associate_rg VARCHAR(255),
  mobile_number VARCHAR(255),
  associate_status INTEGER,
  prescription VARCHAR(255),
  responsible_code UUID,
  documents_folder_id VARCHAR(255),
  rg_patient_proof VARCHAR(255),
  patient_user_code VARCHAR(255),
  adhesion_term TEXT,
  invalid_fields TEXT,
  ciap_codes TEXT,
  associate_birth_date VARCHAR(255),
  preferred_products VARCHAR(255),
  date_prescription DATE,
  annotations TEXT,
  handbook TEXT,
  created_date TIMESTAMP,
  avatar_url VARCHAR(255),
  prescriber VARCHAR(255),
  delivery_address JSONB,
  prescriber_code VARCHAR(255),
  session_token VARCHAR(255),
  session_expires TIMESTAMP,
  last_activity TIMESTAMP,
  is_session_active BOOLEAN,
  fullname VARCHAR(255),
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,
  CONSTRAINT fk_users_responsible_code FOREIGN KEY (responsible_code) REFERENCES users(user_code) ON DELETE SET NULL
);

-- system_users (operadores do painel; ex-Kunk_Users / kunk_users)
CREATE TABLE IF NOT EXISTS system_users (
  id SERIAL PRIMARY KEY,
  date_created TIMESTAMPTZ,
  date_updated TIMESTAMPTZ,
  name VARCHAR(255),
  last_name VARCHAR(255),
  status VARCHAR(255),
  user_code UUID,
  permissions VARCHAR(255),
  email VARCHAR(255),
  password VARCHAR(255),
  cpf VARCHAR(255),
  rg VARCHAR(255),
  birth_date VARCHAR(255),
  gender VARCHAR(255),
  nationality VARCHAR(255),
  marital_status VARCHAR(255),
  mobile_number VARCHAR(255),
  street VARCHAR(255),
  neighborhood VARCHAR(255),
  city VARCHAR(255),
  state VARCHAR(255),
  cep VARCHAR(255),
  pix_key VARCHAR(255),
  commission_value VARCHAR(255),
  transactions VARCHAR(255),
  commission_total VARCHAR(255),
  avatar_url VARCHAR(255),
  utalk_id VARCHAR(255),
  utalk_token TEXT,
  session_token VARCHAR(255),
  session_expires TIMESTAMP,
  last_activity TIMESTAMP,
  is_session_active BOOLEAN,
  internal_code VARCHAR(255)
);

-- Orders → orders
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  sort INTEGER,
  date_created TIMESTAMPTZ,
  date_updated TIMESTAMPTZ,
  status VARCHAR(255),
  total REAL,
  payment_method VARCHAR(255),
  tracking_code VARCHAR(255),
  delivery_price REAL,
  associate_name VARCHAR(255),
  order_code UUID,
  user_code VARCHAR(255),
  items JSONB,
  created_date TIMESTAMP,
  discount REAL,
  details TEXT,
  donation REAL,
  prescriber VARCHAR(255),
  payment_link TEXT,
  "user" INTEGER,
  carrier_order_code VARCHAR(255),
  payment_code TEXT,
  order_notes TEXT,
  tags JSONB,
  delivery_notes TEXT,
  address JSONB,
  whatsapp_message VARCHAR(255),
  prescriber_code VARCHAR(255),
  payment_date TIMESTAMP,
  custom_payment JSONB,
  production_owner VARCHAR(255),
  tracking_code_date TIMESTAMP,
  last_tracking_date TIMESTAMP,
  address_validation VARCHAR(255),
  created_by_user_code VARCHAR(255),
  freight_carrier VARCHAR(32),
  freight_option JSONB,
  dce JSONB,
  CONSTRAINT fk_orders_user FOREIGN KEY ("user") REFERENCES users(id)
);

-- Orders_files → orders_files
CREATE TABLE IF NOT EXISTS orders_files (
  id SERIAL PRIMARY KEY,
  order_id INTEGER,
  file_id UUID,
  CONSTRAINT fk_orders_files_order_id FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_orders_files_file_id FOREIGN KEY (file_id) REFERENCES files(id)
);

-- Partners → partners
CREATE TABLE IF NOT EXISTS partners (
  id SERIAL PRIMARY KEY,
  status VARCHAR(255) NOT NULL,
  sort INTEGER,
  date_created TIMESTAMPTZ,
  date_updated TIMESTAMPTZ,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  account_password VARCHAR(255),
  mobile_number VARCHAR(255),
  user_code UUID,
  documents_folder_id VARCHAR(255),
  commission_value INTEGER,
  commission_total REAL,
  type VARCHAR(255),
  pix_key VARCHAR(255),
  commission_transactions TEXT,
  cpf VARCHAR(255),
  is_favorite VARCHAR(255),
  contest_reports JSONB
);

-- Products → products
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  status VARCHAR(255) NOT NULL,
  sort INTEGER,
  user_created UUID,
  date_created TIMESTAMPTZ,
  user_updated UUID,
  date_updated TIMESTAMPTZ,
  name VARCHAR(255),
  sku VARCHAR(255),
  type VARCHAR(255),
  unit VARCHAR(255),
  concentration INTEGER,
  price REAL,
  amount INTEGER,
  category VARCHAR(255),
  photo UUID,
  batch VARCHAR(255)
);

-- Professionals → professionals
CREATE TABLE IF NOT EXISTS professionals (
  id SERIAL PRIMARY KEY,
  sort INTEGER,
  date_created TIMESTAMPTZ,
  name VARCHAR(255),
  last_name VARCHAR(255),
  type VARCHAR(255),
  services_description VARCHAR(255),
  phone VARCHAR(255),
  state VARCHAR(255),
  city VARCHAR(255),
  cpf VARCHAR(255),
  email VARCHAR(255),
  specialty VARCHAR(255),
  active INTEGER,
  is_prescriber VARCHAR(255),
  is_collaborator VARCHAR(255),
  professional_code UUID UNIQUE,
  fingerprint VARCHAR(255),
  contest_reports JSONB,
  met_us VARCHAR(255),
  recipient_id VARCHAR(255),
  donation_balance INTEGER,
  calendar_id VARCHAR(255)
);

-- Reception → reception
CREATE TABLE IF NOT EXISTS reception (
  id SERIAL PRIMARY KEY,
  date_created TIMESTAMPTZ,
  name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(255),
  option1 VARCHAR(255),
  option2 VARCHAR(255),
  is_associate VARCHAR(255),
  message TEXT,
  code UUID,
  chat_id VARCHAR(255),
  status VARCHAR(255),
  associate_name VARCHAR(255),
  associate_code VARCHAR(255),
  date_updated TIMESTAMP,
  avatar_url VARCHAR(255),
  patient_name VARCHAR(255),
  attendant VARCHAR(255),
  tags JSONB,
  completion_reason VARCHAR(255),
  is_prescriber VARCHAR(255),
  at VARCHAR(255),
  full_name VARCHAR(255)
);

-- reports → reports
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  date_created TIMESTAMPTZ,
  date_updated TIMESTAMPTZ,
  name VARCHAR(255),
  report_code UUID,
  query_config JSONB,
  sql_query TEXT,
  type VARCHAR(255),
  dashboard_queries JSONB,
  layout_positions JSONB,
  chart_config JSONB,
  created_by VARCHAR(255),
  tags JSONB,
  column_maps JSONB,
  embedded_report_codes JSONB,
  favorites JSONB
);

-- services → services
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  sort INTEGER,
  type VARCHAR(255),
  date_created TIMESTAMPTZ,
  name VARCHAR(255),
  professional_id UUID,
  status VARCHAR(255),
  price INTEGER,
  associate_name VARCHAR(255),
  associate_user_code UUID,
  associate_email VARCHAR(255),
  professional_name VARCHAR(255),
  event_link VARCHAR(255),
  consultation_date TIMESTAMP,
  payment_link VARCHAR(255),
  event_id VARCHAR(255),
  price_paid REAL,
  donation REAL,
  booking_group_code VARCHAR(255),
  patient_name VARCHAR(255),
  professional_email VARCHAR(255),
  service_code UUID,
  observations TEXT,
  payment_type VARCHAR(255),
  tags JSONB,
  created_by_user_code VARCHAR(255),
  payment_code TEXT,
  payment_info JSONB,
  CONSTRAINT fk_services_professional_id FOREIGN KEY (professional_id) REFERENCES professionals(professional_code) ON DELETE SET NULL,
  CONSTRAINT fk_services_associate_user_code FOREIGN KEY (associate_user_code) REFERENCES users(user_code) ON DELETE SET NULL
);

-- services_files → services_files
CREATE TABLE IF NOT EXISTS services_files (
  id SERIAL PRIMARY KEY,
  service_id INTEGER,
  file_id UUID,
  CONSTRAINT fk_services_files_service_id FOREIGN KEY (service_id) REFERENCES services(id),
  CONSTRAINT fk_services_files_file_id FOREIGN KEY (file_id) REFERENCES files(id)
);

-- Tags → tags
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  tag VARCHAR(255),
  contexts VARCHAR(255),
  color VARCHAR(255)
);

-- System configs (per-system runtime env overrides; not exposed via /items)
CREATE TABLE IF NOT EXISTS system_configs (
  id SERIAL PRIMARY KEY,
  system VARCHAR(64) NOT NULL,
  key VARCHAR(128) NOT NULL,
  value TEXT,
  value_type VARCHAR(32) NOT NULL DEFAULT 'string',
  is_sensitive BOOLEAN NOT NULL DEFAULT false,
  is_required BOOLEAN NOT NULL DEFAULT false,
  allow_hardcoded BOOLEAN NOT NULL DEFAULT true,
  hardcoded_default TEXT,
  description TEXT,
  date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_updated TIMESTAMP,
  UNIQUE (system, key)
);

-- system_api_credentials: encrypted API secrets for external integrations
CREATE TABLE IF NOT EXISTS system_api_credentials (
  id SERIAL PRIMARY KEY,
  service VARCHAR(64) NOT NULL,
  field_key VARCHAR(128) NOT NULL,
  encrypted_value TEXT,
  env_fallback VARCHAR(128),
  is_secret BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  last_tested_at TIMESTAMPTZ,
  last_test_ok BOOLEAN,
  date_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_updated TIMESTAMPTZ,
  UNIQUE (service, field_key)
);

CREATE INDEX IF NOT EXISTS idx_system_api_credentials_service
  ON system_api_credentials (service);

-- system_activity: operator action audit log
CREATE TABLE IF NOT EXISTS system_activity (
  id SERIAL PRIMARY KEY,
  date_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_code TEXT,
  action TEXT NOT NULL,
  actor_user_code TEXT,
  actor_name TEXT,
  related_user_code TEXT,
  related_user_name TEXT,
  summary TEXT NOT NULL,
  metadata JSONB,
  read_by JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_system_activity_date_created
  ON system_activity (date_created DESC);

CREATE INDEX IF NOT EXISTS idx_system_activity_entity
  ON system_activity (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_system_activity_related
  ON system_activity (related_user_code, date_created DESC);

CREATE INDEX IF NOT EXISTS idx_system_activity_actor
  ON system_activity (actor_user_code, date_created DESC);

-- Users_Api → users_api
CREATE TABLE IF NOT EXISTS users_api (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255),
  token VARCHAR(255)
);

-- Users_files → users_files
CREATE TABLE IF NOT EXISTS users_files (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  file_id UUID,
  doc_type VARCHAR(32),
  side VARCHAR(16),
  subject VARCHAR(32),
  doc_kind VARCHAR(32),
  CONSTRAINT fk_users_files_user_id FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_users_files_file_id FOREIGN KEY (file_id) REFERENCES files(id)
);
