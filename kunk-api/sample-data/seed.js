'use strict';

/**
 * Gera e grava sample data fictício com TODOS os campos do target-schema.sql.
 *
 * Uso:
 *   node sample-data/seed.js
 *   node sample-data/seed.js --generate
 *   node sample-data/seed.js --no-truncate
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const manifest = require('./manifest.json');
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const DEMO_PASSWORD = manifest.demo_login.password;
const SALT_ROUNDS = 8;

const FIRST_NAMES = [
  'Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Fábio', 'Gabriela', 'Hugo', 'Iris', 'João',
  'Karen', 'Lucas', 'Marina', 'Nuno', 'Olívia', 'Paulo', 'Queila', 'Rafael', 'Sofia', 'Tiago',
  'Úrsula', 'Vitor', 'Wanda', 'Xavier', 'Yasmin', 'Zeca', 'Beatriz', 'Caio', 'Débora', 'Eduardo',
];
const LAST_NAMES = [
  'Almeida', 'Barbosa', 'Cardoso', 'Dias', 'Esteves', 'Freitas', 'Gomes', 'Henrique', 'Ibrahim',
  'Junqueira', 'Klein', 'Lima', 'Mendes', 'Nogueira', 'Oliveira', 'Pereira', 'Queiroz', 'Ramos',
  'Silva', 'Teixeira', 'Uchoa', 'Vieira', 'Wagner', 'Xavier', 'Yamamoto', 'Zanetti',
];
const CITIES = [
  ['São Paulo', 'SP'], ['Campinas', 'SP'], ['Curitiba', 'PR'], ['Florianópolis', 'SC'],
  ['Belo Horizonte', 'MG'], ['Porto Alegre', 'RS'], ['Recife', 'PE'], ['Salvador', 'BA'],
  ['Brasília', 'DF'], ['Goiânia', 'GO'],
];
const ORDER_STATUSES = [
  'Aguardando pagamento', 'Pagamento concluído', 'Em produção', 'Produção Finalizada',
  'Adicionado no sistema', 'Enviado', 'Entregue', 'Cancelado',
];
const SERVICE_STATUSES = ['pending', 'confirmed', 'completed', 'canceled'];
/** Alinhado a triage.statuses OSS (`waiting` / `done`). */
const RECEPTION_STATUSES = ['waiting', 'waiting', 'waiting', 'done', 'waiting'];
const CIAP = ['A98', 'P76', 'L18', 'N01', 'R74', 'T90', 'K86'];
/** Alinhado a GENDER_OPTIONS em @kunk/forms (GenderSelect do cadastramento). */
const GENDER_OPTIONS = [
  'homem-cis',
  'mulher-cis',
  'homem-trans',
  'mulher-trans',
  'travesti',
  'nao-binario',
  'outro',
];

const PRODUCT_CATALOG = [
  { name: 'Spectrum Oil 10ml', sku: 'KNK-OIL-100', type: 'oil', unit: 'ml', concentration: 100, price: 189.9, category: 'wellness', amount: 40 },
  { name: 'Spectrum Oil 30ml', sku: 'KNK-OIL-300', type: 'oil', unit: 'ml', concentration: 300, price: 349.9, category: 'wellness', amount: 25 },
  { name: 'Calm Caps 30ct', sku: 'KNK-CAP-25', type: 'capsule', unit: 'unit', concentration: 25, price: 159.9, category: 'sleep', amount: 60 },
  { name: 'Calm Caps 60ct', sku: 'KNK-CAP-25-60', type: 'capsule', unit: 'unit', concentration: 25, price: 279.9, category: 'sleep', amount: 35 },
  { name: 'Focus Softgel 30ct', sku: 'KNK-SFT-15', type: 'softgel', unit: 'unit', concentration: 15, price: 129.9, category: 'focus', amount: 50 },
  { name: 'Recovery Balm 50g', sku: 'KNK-BAL-50', type: 'topical', unit: 'g', concentration: 50, price: 99.9, category: 'recovery', amount: 45 },
  { name: 'Night Drops 15ml', sku: 'KNK-DRP-150', type: 'oil', unit: 'ml', concentration: 150, price: 219.9, category: 'sleep', amount: 30 },
  { name: 'Daily Tincture 20ml', sku: 'KNK-TIN-200', type: 'tincture', unit: 'ml', concentration: 200, price: 259.9, category: 'wellness', amount: 28 },
  { name: 'Sport Gel 75ml', sku: 'KNK-GEL-75', type: 'topical', unit: 'ml', concentration: 75, price: 119.9, category: 'recovery', amount: 40 },
  { name: 'Extract Isolate 1g', sku: 'KNK-ISO-1000', type: 'extract', unit: 'g', concentration: 1000, price: 399.9, category: 'wellness', amount: 15 },
  { name: 'Pet Care Oil 10ml', sku: 'KNK-PET-50', type: 'oil', unit: 'ml', concentration: 50, price: 89.9, category: 'pet', amount: 20 },
  { name: 'Starter Kit Duo', sku: 'KNK-KIT-001', type: 'kit', unit: 'unit', concentration: 125, price: 299.9, category: 'wellness', amount: 18 },
];

/** Colunas que precisam de aspas no SQL */
const QUOTED = new Set(['user']);

function uuid() {
  return crypto.randomUUID();
}

function pick(arr, i) {
  return arr[i % arr.length];
}

function fakeCpf(n) {
  const base = String(90000000000 + n).padStart(11, '0');
  return `${base.slice(0, 3)}.${base.slice(3, 6)}.${base.slice(6, 9)}-${base.slice(9)}`;
}

function fakePhone(n) {
  const ddd = 11 + (n % 80);
  const num = String(900000000 + n).slice(-9);
  return `+55${ddd}${num}`;
}

function fakeCep(n) {
  const raw = String(10000000 + (n % 89999999)).padStart(8, '0');
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function dateOnlyDaysAgo(n) {
  return daysAgo(n).slice(0, 10);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function quoteCol(name) {
  return QUOTED.has(name) ? `"${name}"` : name;
}

function serializeValue(v) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

async function buildDataset(passwordHash) {
  const counts = manifest.counts;

  const files = Array.from({ length: counts.files }, (_, i) => ({
    id: uuid(),
    filename: `demo-doc-${String(i + 1).padStart(2, '0')}.pdf`,
    mime_type: 'application/pdf',
    storage_path: `sample-data/assets/demo-doc-${String(i + 1).padStart(2, '0')}.pdf`,
    created_at: daysAgo(30 - i),
  }));

  const system_users = [
    {
      date_created: daysAgo(60),
      date_updated: daysAgo(1),
      name: 'Admin',
      last_name: 'Demo',
      status: 'active',
      user_code: uuid(),
      permissions: JSON.stringify(['Administrador']),
      email: manifest.demo_login.email,
      password: passwordHash,
      cpf: fakeCpf(9001),
      rg: '9000001',
      birth_date: '1985-03-12',
      gender: 'homem-cis',
      nationality: 'Brasileira',
      marital_status: 'solteiro',
      mobile_number: fakePhone(9001),
      street: 'Rua Admin Demo 1',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      cep: fakeCep(9001),
      pix_key: 'admin@demo.kunk.local',
      commission_value: '0',
      transactions: '[]',
      commission_total: '0',
      avatar_url: 'https://cdn.demo.kunk.local/avatars/admin.png',
      utalk_id: 'utalk-admin-demo',
      utalk_token: 'demo-utalk-token-admin',
      session_token: 'inactive-admin-session',
      session_expires: daysAgo(-1),
      last_activity: daysAgo(0),
      is_session_active: false,
      internal_code: 'KNK-ADMIN',
    },
    {
      date_created: daysAgo(55),
      date_updated: daysAgo(2),
      name: 'Lia',
      last_name: 'Acolhimento',
      status: 'active',
      user_code: uuid(),
      permissions: JSON.stringify(['Acolhimento']),
      email: 'acolhimento@demo.kunk.local',
      password: passwordHash,
      cpf: fakeCpf(9002),
      rg: '9000002',
      birth_date: '1990-07-21',
      gender: 'mulher-cis',
      nationality: 'Brasileira',
      marital_status: 'casado',
      mobile_number: fakePhone(9002),
      street: 'Rua Acolhimento Demo 2',
      neighborhood: 'Jardins',
      city: 'Campinas',
      state: 'SP',
      cep: fakeCep(9002),
      pix_key: 'acolhimento@pix.demo',
      commission_value: '0',
      transactions: '[]',
      commission_total: '0',
      avatar_url: 'https://cdn.demo.kunk.local/avatars/lia.png',
      utalk_id: 'utalk-lia-demo',
      utalk_token: 'demo-utalk-token-lia',
      session_token: 'inactive-lia-session',
      session_expires: daysAgo(-1),
      last_activity: daysAgo(1),
      is_session_active: false,
      internal_code: 'KNK-ACOL',
    },
    {
      date_created: daysAgo(50),
      date_updated: daysAgo(3),
      name: 'Pedro',
      last_name: 'Produção',
      status: 'active',
      user_code: uuid(),
      permissions: JSON.stringify(['Produção']),
      email: 'producao@demo.kunk.local',
      password: passwordHash,
      cpf: fakeCpf(9003),
      rg: '9000003',
      birth_date: '1988-11-05',
      gender: 'homem-cis',
      nationality: 'Brasileira',
      marital_status: 'união estável',
      mobile_number: fakePhone(9003),
      street: 'Rua Produção Demo 3',
      neighborhood: 'Industrial',
      city: 'Curitiba',
      state: 'PR',
      cep: fakeCep(9003),
      pix_key: 'producao@pix.demo',
      commission_value: '0',
      transactions: '[]',
      commission_total: '0',
      avatar_url: 'https://cdn.demo.kunk.local/avatars/pedro.png',
      utalk_id: 'utalk-pedro-demo',
      utalk_token: 'demo-utalk-token-pedro',
      session_token: 'inactive-pedro-session',
      session_expires: daysAgo(-1),
      last_activity: daysAgo(2),
      is_session_active: false,
      internal_code: 'KNK-PROD',
    },
  ];

  const partners = Array.from({ length: counts.partners }, (_, i) => {
    const first = pick(FIRST_NAMES, i + 3);
    const last = pick(LAST_NAMES, i + 7);
    const [city, state] = pick(CITIES, i);
    return {
      status: 'active',
      sort: i + 1,
      date_created: daysAgo(40 - i),
      date_updated: daysAgo(i % 10),
      first_name: first,
      last_name: last,
      email: `partner${String(i + 1).padStart(2, '0')}@demo.kunk.local`,
      account_password: passwordHash,
      mobile_number: fakePhone(200 + i),
      user_code: uuid(),
      documents_folder_id: `folder-partner-${i + 1}`,
      commission_value: 5 + (i % 6),
      commission_total: 100 * (i + 1),
      type: i % 2 === 0 ? 'affiliate' : 'prescriber_partner',
      pix_key: `partner${i + 1}@pix.demo`,
      commission_transactions: JSON.stringify([{ id: i + 1, amount: 50, demo: true }]),
      cpf: fakeCpf(200 + i),
      is_favorite: i < 3 ? 'true' : 'false',
      contest_reports: { demo: true, city, state, score: i + 1 },
    };
  });

  const professionals = Array.from({ length: counts.professionals }, (_, i) => {
    const first = pick(FIRST_NAMES, i + 11);
    const last = pick(LAST_NAMES, i + 13);
    const [city, state] = pick(CITIES, i);
    return {
      sort: i + 1,
      date_created: daysAgo(45 - i),
      name: first,
      last_name: last,
      type: i % 3 === 0 ? 'physician' : 'therapist',
      services_description: 'Atendimento clínico demo Kunk OSS',
      phone: fakePhone(300 + i),
      state,
      city,
      cpf: fakeCpf(300 + i),
      email: `pro${String(i + 1).padStart(2, '0')}@demo.kunk.local`,
      specialty: pick(['clínica geral', 'psiquiatria', 'dor', 'neurologia', 'integrativa'], i),
      active: 1,
      is_prescriber: i % 2 === 0 ? 'true' : 'false',
      is_collaborator: i < 4 ? 'true' : 'false',
      professional_code: uuid(),
      fingerprint: `fp-demo-${i + 1}`,
      contest_reports: { demo: true, specialty_rank: i + 1 },
      met_us: pick(['indicação', 'evento', 'site', 'parceiro'], i),
      recipient_id: `rcp-demo-${i + 1}`,
      donation_balance: 50 * (i + 1),
      calendar_id: `cal-demo-${i + 1}`,
    };
  });

  const products = PRODUCT_CATALOG.slice(0, counts.products).map((p, i) => ({
    status: 'published',
    sort: i + 1,
    user_created: uuid(),
    date_created: daysAgo(90 - i),
    user_updated: uuid(),
    date_updated: daysAgo(i % 20),
    name: p.name,
    sku: p.sku,
    type: p.type,
    unit: p.unit,
    concentration: p.concentration,
    price: p.price,
    amount: p.amount,
    category: p.category,
    photo: files[i % files.length].id,
    batch: `LOT-DEMO-${String(i + 1).padStart(3, '0')}`,
  }));

  const tags = [
    { tag: 'urgente', contexts: 'orders', color: '#C62828' },
    { tag: 'retirada', contexts: 'orders', color: '#1565C0' },
    { tag: 'primeiro-pedido', contexts: 'orders', color: '#2E7D32' },
    { tag: 'retorno', contexts: 'services', color: '#6A1B9A' },
    { tag: 'teleconsulta', contexts: 'services', color: '#00838F' },
    { tag: 'novo-contato', contexts: 'reception', color: '#EF6C00' },
    { tag: 'follow-up', contexts: 'reception', color: '#455A64' },
    { tag: 'demo', contexts: 'orders,services,reception', color: '#546E7A' },
  ].slice(0, counts.tags);

  const users = Array.from({ length: counts.users }, (_, i) => {
    const first = pick(FIRST_NAMES, i);
    const last = pick(LAST_NAMES, i * 3);
    const [city, state] = pick(CITIES, i);
    const pro = professionals[i % professionals.length];
    const userCode = uuid();
    const isPatientLink = i >= 80;
    const product = products[i % products.length];

    return {
      status: i % 17 === 0 ? 'inactive' : 'active',
      sort: i + 1,
      date_created: daysAgo(100 - (i % 90)),
      date_updated: daysAgo(i % 30),
      associate_name: first,
      associate_last_name: last,
      gender: pick(GENDER_OPTIONS, i),
      nationality: 'Brasileira',
      associate_rg_issuer: pick(['SSP/SP', 'SSP/PR', 'SSP/MG', 'SSP/RS'], i),
      marital_status: pick(['solteiro', 'casado', 'união estável', 'divorciado'], i),
      email: `associate${String(i + 1).padStart(3, '0')}@demo.kunk.local`,
      street: `Rua Demo ${100 + i}`,
      street_number: String(10 + (i % 90)),
      complement: i % 3 === 0 ? `Apto ${i + 1}` : `Casa`,
      neighborhood: pick(['Centro Demo', 'Jardim Sample', 'Vila Teste', 'Bairro Norte'], i),
      proof_of_address: `proof-address-${i + 1}.pdf`,
      reason_treatment_text: 'Motivo de tratamento fictício para sample-data (sem dado clínico real).',
      responsible_type: isPatientLink ? 'paciente' : pick(['titular', 'responsável'], i),
      city,
      state,
      cep: fakeCep(i + 1),
      email_account: `associate${String(i + 1).padStart(3, '0')}@demo.kunk.local`,
      account_password: passwordHash,
      user_code: userCode,
      rg_proof: `rg-proof-${i + 1}.pdf`,
      associate_cpf: fakeCpf(i + 1),
      associate_rg: `${String(1000000 + i)}`,
      mobile_number: fakePhone(i + 1),
      associate_status: i % 17 === 0 ? 0 : 1,
      prescription: `prescription-${i + 1}.pdf`,
      documents_folder_id: `docs-user-${i + 1}`,
      rg_patient_proof: isPatientLink ? `rg-patient-${i + 1}.pdf` : `rg-self-${i + 1}.pdf`,
      adhesion_term: 'Termo de adesão fictício — sample-data Kunk OSS.',
      ciap_codes: `${pick(CIAP, i)};${pick(CIAP, i + 3)}`,
      associate_birth_date: `19${70 + (i % 30)}-${String((i % 12) + 1).padStart(2, '0')}-15`,
      preferred_products: product.sku,
      date_prescription: dateOnlyDaysAgo(20 + (i % 40)),
      created_date: daysAgo(100 - (i % 90)),
      avatar_url: `https://cdn.demo.kunk.local/avatars/user-${i + 1}.png`,
      prescriber: `${pro.name} ${pro.last_name}`,
      delivery_address: {
        street: `Rua Demo ${100 + i}`,
        number: String(10 + (i % 90)),
        complement: i % 3 === 0 ? `Apto ${i + 1}` : 'Sem complemento',
        neighborhood: 'Centro Demo',
        city,
        state,
        cep: fakeCep(i + 1),
        country: 'BR',
      },
      prescriber_code: String(pro.professional_code),
      session_token: `inactive-demo-token-${i + 1}`,
      session_expires: daysAgo(-1),
      last_activity: daysAgo(i % 14),
      is_session_active: false,
      fullname: `${first} ${last}`,
      patient_user_code: null,
      responsible_code: null,
    };
  });

  for (let i = 80; i < 100; i++) {
    users[i].responsible_type = 'paciente';
    users[i].responsible_code = users[i - 80].user_code;
    users[i].patient_user_code = null;
  }

  const orders = Array.from({ length: counts.orders }, (_, i) => {
    const user = users[i % users.length];
    const pro = professionals[i % professionals.length];
    const p1 = products[i % products.length];
    const p2 = products[(i + 3) % products.length];
    const qty1 = 1 + (i % 3);
    const qty2 = i % 2 === 0 ? 1 : 0;
    const items = [
      {
        sku: p1.sku,
        name: p1.name,
        quantity: qty1,
        concentration_mg: p1.concentration,
        unit: p1.unit,
        price: p1.price,
        batch: p1.batch,
        category: p1.category,
      },
    ];
    if (qty2) {
      items.push({
        sku: p2.sku,
        name: p2.name,
        quantity: qty2,
        concentration_mg: p2.concentration,
        unit: p2.unit,
        price: p2.price,
        batch: p2.batch,
        category: p2.category,
      });
    }
    const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
    const delivery = 15 + (i % 5) * 3;
    const status = pick(ORDER_STATUSES, i);
    const paid = ['Pagamento concluído', 'Em produção', 'Produção Finalizada', 'Enviado', 'Entregue'].includes(status);
    const shipped = ['Enviado', 'Entregue'].includes(status);

    return {
      sort: i + 1,
      date_created: daysAgo(50 - (i % 45)),
      date_updated: daysAgo(i % 20),
      status,
      total: Math.round((subtotal + delivery) * 100) / 100,
      payment_method: pick(['pix', 'credit_card', 'boleto'], i),
      tracking_code: shipped ? `BRDEMO${100000 + i}` : `PENDING-${100000 + i}`,
      delivery_price: delivery,
      associate_name: user.fullname,
      order_code: uuid(),
      user_code: String(user.user_code),
      items,
      created_date: daysAgo(50 - (i % 45)),
      discount: i % 7 === 0 ? 10 : 0,
      details: 'Pedido demo sample-data com todos os campos preenchidos.',
      donation: i % 4 === 0 ? 20 : 0,
      prescriber: `${pro.name} ${pro.last_name}`,
      payment_link: `https://pay.demo.kunk.local/o/${i + 1}`,
      _user_index: i % users.length,
      carrier_order_code: shipped ? `CARRIER-${7000 + i}` : `CARRIER-PENDING-${7000 + i}`,
      payment_code: paid ? `PAY-${8000 + i}` : `PAY-PENDING-${8000 + i}`,
      order_notes: 'Observação interna fictícia do pedido.',
      tags: [{ tag: 'demo' }, ...(i % 3 === 0 ? [{ tag: 'urgente' }] : [])],
      delivery_notes: shipped ? 'Entregar em horário comercial (demo).' : 'Aguardando despacho.',
      address: user.delivery_address,
      whatsapp_message: 'Mensagem WhatsApp fictícia do pedido demo.',
      prescriber_code: String(pro.professional_code),
      payment_date: paid ? daysAgo(40 - (i % 30)) : daysAgo(50),
      custom_payment: {
        method: paid ? 'pix' : 'pending',
        installments: paid ? 1 : 0,
        gateway: 'demo-gateway',
      },
      production_owner: ['Em produção', 'Produção Finalizada'].includes(status)
        ? 'Pedro Produção'
        : 'não atribuído',
      tracking_code_date: shipped ? daysAgo(10 - (i % 8)) : daysAgo(50),
      last_tracking_date: shipped ? daysAgo(5 - (i % 4)) : daysAgo(50),
      address_validation: pick(['valid', 'pending', 'corrected'], i),
      created_by_user_code: 'KNK-ADMIN',
    };
  });

  const services = Array.from({ length: counts.services }, (_, i) => {
    const user = users[i % users.length];
    const pro = professionals[i % professionals.length];
    const status = pick(SERVICE_STATUSES, i);
    const price = 150 + (i % 5) * 50;
    return {
      sort: i + 1,
      type: pick(['consulta', 'retorno', 'avaliação'], i),
      date_created: daysAgo(30 - (i % 25)),
      name: `Atendimento demo #${i + 1}`,
      professional_id: pro.professional_code,
      status,
      price,
      associate_name: user.fullname,
      associate_user_code: user.user_code,
      associate_email: user.email,
      professional_name: `${pro.name} ${pro.last_name}`,
      event_link: `https://meet.demo.kunk.local/s/${i + 1}`,
      consultation_date: daysAgo(20 - (i % 15)),
      payment_link: `https://pay.demo.kunk.local/s/${i + 1}`,
      event_id: `evt-demo-${i + 1}`,
      price_paid: status === 'completed' || status === 'confirmed' ? price : 0,
      donation: i % 5 === 0 ? 30 : 0,
      booking_group_code: uuid(),
      patient_name: user.fullname,
      professional_email: pro.email,
      service_code: uuid(),
      observations: 'Agendamento fictício com campos completos (sample-data).',
      payment_type: pick(['pix', 'credit_card', 'cash'], i),
      tags: [{ tag: 'demo' }, { tag: 'teleconsulta' }],
      created_by_user_code: 'KNK-ACOL',
      payment_code: `SVCPAY-${i + 1}`,
      payment_info: {
        demo: true,
        gateway: 'demo-gateway',
        paid: status === 'completed' || status === 'confirmed',
      },
    };
  });

  const reception = Array.from({ length: counts.reception }, (_, i) => {
    const first = pick(FIRST_NAMES, i + 5);
    const last = pick(LAST_NAMES, i + 9);
    const status = pick(RECEPTION_STATUSES, i);
    const user = users[i % users.length];
    return {
      date_created: daysAgo(20 - i),
      name: first,
      last_name: last,
      email: `reception${String(i + 1).padStart(2, '0')}@demo.kunk.local`,
      phone: fakePhone(400 + i),
      option1: pick(['informação', 'cadastro', 'agendamento'], i),
      option2: pick(['whatsapp', 'site', 'indicação'], i),
      is_associate: i % 3 === 0 ? 'true' : 'false',
      message: 'Contato fictício de acolhimento com todos os campos (sample-data).',
      code: uuid(),
      chat_id: `chat-demo-${i + 1}`,
      status,
      associate_name: i % 3 === 0 ? user.fullname : `${first} ${last}`,
      associate_code: i % 3 === 0 ? String(user.user_code) : `LEAD-${i + 1}`,
      date_updated: daysAgo(10 - (i % 8)),
      avatar_url: `https://cdn.demo.kunk.local/avatars/reception-${i + 1}.png`,
      patient_name: i % 2 === 0 ? `${first} ${last}` : user.fullname,
      attendant: i % 2 === 0 ? 'Lia Acolhimento' : 'Admin Demo',
      tags: [{ tag: 'demo' }, { tag: 'novo-contato' }],
      completion_reason: status === 'done' ? 'Atendido' : null,
      is_prescriber: i % 4 === 0 ? 'true' : 'false',
      at: pick(['manhã', 'tarde', 'noite'], i),
      full_name: `${first} ${last}`,
    };
  });

  const reports = [
    {
      date_created: daysAgo(10),
      date_updated: daysAgo(1),
      name: 'Pedidos por status (demo)',
      report_code: uuid(),
      query_config: { source: 'orders', group_by: 'status' },
      sql_query: '-- sample only; execução livre bloqueada na API',
      type: 'table',
      dashboard_queries: { orders_by_status: true },
      layout_positions: { x: 0, y: 0, w: 6, h: 4 },
      chart_config: { type: 'bar', stacked: false },
      created_by: manifest.demo_login.email,
      tags: [{ tag: 'demo' }],
      column_maps: { status: 'Status', count: 'Total' },
      embedded_report_codes: [],
      favorites: { users: [] },
    },
    {
      date_created: daysAgo(9),
      date_updated: daysAgo(2),
      name: 'Associados ativos (demo)',
      report_code: uuid(),
      query_config: { source: 'users', filter: { status: 'active' } },
      sql_query: '-- sample only',
      type: 'table',
      dashboard_queries: { active_users: true },
      layout_positions: { x: 6, y: 0, w: 6, h: 4 },
      chart_config: { type: 'pie' },
      created_by: manifest.demo_login.email,
      tags: [{ tag: 'demo' }],
      column_maps: { fullname: 'Nome', status: 'Status' },
      embedded_report_codes: [],
      favorites: { users: [] },
    },
    {
      date_created: daysAgo(8),
      date_updated: daysAgo(3),
      name: 'Dashboard operacional (demo)',
      report_code: uuid(),
      query_config: { widgets: ['orders', 'services', 'reception'] },
      sql_query: '-- sample only',
      type: 'dashboard',
      dashboard_queries: { orders: true, services: true, reception: true },
      layout_positions: { x: 0, y: 4, w: 12, h: 6 },
      chart_config: { type: 'mixed' },
      created_by: manifest.demo_login.email,
      tags: [{ tag: 'demo' }],
      column_maps: {},
      embedded_report_codes: [],
      favorites: { users: [manifest.demo_login.email] },
    },
  ].slice(0, counts.reports);

  const users_api = [
    {
      email: JSON.stringify({ label: 'demo-integration', scopes: ['*'] }),
      token: await bcrypt.hash('kunk_live_demo_sample_token_do_not_use_prod', SALT_ROUNDS),
    },
  ];

  return {
    files,
    system_users,
    users,
    partners,
    professionals,
    products,
    tags,
    orders,
    services,
    reception,
    reports,
    users_api,
  };
}

function writeFixtures(dataset) {
  ensureDir(FIXTURES_DIR);
  for (const [key, value] of Object.entries(dataset)) {
    fs.writeFileSync(path.join(FIXTURES_DIR, `${key}.json`), JSON.stringify(value, null, 2));
  }
  console.log(`Fixtures written to ${FIXTURES_DIR}`);
}

async function truncateAll(client) {
  await client.query(`
    TRUNCATE TABLE
      orders_files, services_files, users_files,
      orders, services, reception, reports, tags, products, partners, professionals,
      users, system_users, users_api, files
    RESTART IDENTITY CASCADE
  `);
  console.log('Tables truncated');
}

async function insertObject(client, table, row, { returning = 'id' } = {}) {
  const entries = Object.entries(row).filter(([k, v]) => !k.startsWith('_') && v !== undefined);
  const cols = entries.map(([k]) => quoteCol(k));
  const vals = entries.map(([, v]) => serializeValue(v));
  const ph = vals.map((_, i) => `$${i + 1}`);
  const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${ph.join(', ')}) RETURNING ${returning}`;
  const result = await client.query(sql, vals);
  return result.rows[0];
}

async function seedDatabase(dataset, { truncate }) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    if (truncate) await truncateAll(client);

    for (const f of dataset.files) {
      await insertObject(client, 'files', f, { returning: 'id' });
    }
    console.log(`files: ${dataset.files.length}`);

    for (const row of dataset.system_users) {
      await insertObject(client, 'system_users', row);
    }
    console.log(`system_users: ${dataset.system_users.length}`);

    const userIds = [];
    for (const row of dataset.users) {
      const inserted = await insertObject(client, 'users', row);
      userIds.push(inserted.id);
    }
    console.log(`users: ${userIds.length} (all columns)`);

    for (const row of dataset.partners) {
      await insertObject(client, 'partners', row);
    }
    console.log(`partners: ${dataset.partners.length}`);

    for (const row of dataset.professionals) {
      await insertObject(client, 'professionals', row);
    }
    console.log(`professionals: ${dataset.professionals.length}`);

    for (const row of dataset.products) {
      await insertObject(client, 'products', row);
    }
    console.log(`products: ${dataset.products.length}`);

    for (const row of dataset.tags) {
      await insertObject(client, 'tags', row);
    }
    console.log(`tags: ${dataset.tags.length}`);

    const orderIds = [];
    for (const order of dataset.orders) {
      const payload = { ...order, user: userIds[order._user_index] };
      delete payload._user_index;
      const inserted = await insertObject(client, 'orders', payload);
      orderIds.push(inserted.id);
    }
    console.log(`orders: ${orderIds.length}`);

    const serviceIds = [];
    for (const row of dataset.services) {
      const inserted = await insertObject(client, 'services', row);
      serviceIds.push(inserted.id);
    }
    console.log(`services: ${serviceIds.length}`);

    for (const row of dataset.reception) {
      await insertObject(client, 'reception', row);
    }
    console.log(`reception: ${dataset.reception.length}`);

    for (const row of dataset.reports) {
      await insertObject(client, 'reports', row);
    }
    console.log(`reports: ${dataset.reports.length}`);

    for (const row of dataset.users_api) {
      await insertObject(client, 'users_api', row);
    }
    console.log(`users_api: ${dataset.users_api.length}`);

    const users_files = [];
    for (let i = 0; i < manifest.counts.users_files; i++) {
      const row = { user_id: userIds[i], file_id: dataset.files[i % dataset.files.length].id };
      users_files.push(row);
      await insertObject(client, 'users_files', row);
    }
    console.log(`users_files: ${users_files.length}`);

    const orders_files = [];
    for (let i = 0; i < manifest.counts.orders_files; i++) {
      const row = { order_id: orderIds[i], file_id: dataset.files[i % dataset.files.length].id };
      orders_files.push(row);
      await insertObject(client, 'orders_files', row);
    }
    console.log(`orders_files: ${orders_files.length}`);

    const services_files = [];
    for (let i = 0; i < manifest.counts.services_files; i++) {
      const row = { service_id: serviceIds[i], file_id: dataset.files[i % dataset.files.length].id };
      services_files.push(row);
      await insertObject(client, 'services_files', row);
    }
    console.log(`services_files: ${services_files.length}`);

    fs.writeFileSync(path.join(FIXTURES_DIR, 'users_files.json'), JSON.stringify(users_files, null, 2));
    fs.writeFileSync(path.join(FIXTURES_DIR, 'orders_files.json'), JSON.stringify(orders_files, null, 2));
    fs.writeFileSync(path.join(FIXTURES_DIR, 'services_files.json'), JSON.stringify(services_files, null, 2));

    // Validação: users deve ter todas as colunas do schema preenchidas (exceto id e session_*)
    const colCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position
    `);
    const sample = await client.query('SELECT * FROM users WHERE id = $1', [userIds[0]]);
    const row = sample.rows[0];
    const optionalEmpty = new Set([
      'invalid_fields',
      'annotations',
      'handbook',
      'responsible_code',
      'patient_user_code',
    ]);
    const missing = [];
    for (const { column_name: col } of colCheck.rows) {
      if (col === 'id') continue;
      if (optionalEmpty.has(col)) continue;
      if (row[col] === null || row[col] === undefined) missing.push(col);
    }
    if (missing.length) {
      console.warn(`Atenção: users ainda com NULL em: ${missing.join(', ')}`);
    } else {
      console.log('Validação users: campos preenchidos (sem invalid_fields, annotations, handbook).');
    }

    await client.query('COMMIT');

    const counts = await client.query(`
      SELECT 'users' AS t, COUNT(*)::int AS c FROM users
      UNION ALL SELECT 'orders', COUNT(*)::int FROM orders
      UNION ALL SELECT 'partners', COUNT(*)::int FROM partners
      UNION ALL SELECT 'professionals', COUNT(*)::int FROM professionals
      UNION ALL SELECT 'products', COUNT(*)::int FROM products
      UNION ALL SELECT 'services', COUNT(*)::int FROM services
      UNION ALL SELECT 'reception', COUNT(*)::int FROM reception
      UNION ALL SELECT 'tags', COUNT(*)::int FROM tags
      UNION ALL SELECT 'system_users', COUNT(*)::int FROM system_users
      UNION ALL SELECT 'reports', COUNT(*)::int FROM reports
      UNION ALL SELECT 'files', COUNT(*)::int FROM files
      ORDER BY t
    `);
    console.log('\nContagens no banco:');
    for (const r of counts.rows) console.log(`  ${r.t}: ${r.c}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const generateOnly = args.includes('--generate');
  const noTruncate = args.includes('--no-truncate');

  console.log('Building full-field fictional sample dataset…');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);
  const dataset = await buildDataset(passwordHash);

  ensureDir(FIXTURES_DIR);
  writeFixtures(dataset);

  const assetsDir = path.join(__dirname, 'assets');
  ensureDir(assetsDir);
  fs.writeFileSync(
    path.join(assetsDir, 'README.md'),
    '# Assets demo\n\nPaths em `files.storage_path` são placeholders.\n'
  );

  if (generateOnly) {
    console.log('Generate-only mode — banco não alterado.');
    return;
  }

  await seedDatabase(dataset, { truncate: !noTruncate });
  console.log('\nSample data completo instalado.');
  console.log(`Login: ${manifest.demo_login.email} / ${DEMO_PASSWORD}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
