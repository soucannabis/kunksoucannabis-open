'use strict';

const { v4: uuidv4 } = require('uuid');
const itemsRepository = require('../repositories/itemsRepository');
const systemConfigService = require('./systemConfigService');
const activityService = require('./activityService');
const { query } = require('../db/pool');
const { AppError } = require('../utils/response');

const STANDARD_FIELD_IDS = new Set([
  'name',
  'last_name',
  'email',
  'phone',
  'is_associate',
  'option1',
  'option2',
  'message',
  'patient_name',
]);

const DEFAULT_OPTION1_OPTIONS = [
  'Preciso de óleo / produto',
  'Renovação de receita',
  'Agendamento / consulta',
  'Dúvidas sobre cadastro',
  'Outro',
];

const DEFAULT_FORM_FIELDS = [
  { id: 'name', enabled: true, required: true, label: 'Nome', order: 1 },
  { id: 'last_name', enabled: true, required: true, label: 'Sobrenome', order: 2 },
  { id: 'email', enabled: true, required: true, label: 'E-mail', order: 3 },
  { id: 'phone', enabled: true, required: true, label: 'Telefone', order: 4 },
  {
    id: 'option1',
    enabled: true,
    required: false,
    label: 'Como podemos ajudar?',
    order: 5,
    type: 'select',
    options: [...DEFAULT_OPTION1_OPTIONS],
  },
  { id: 'option2', enabled: false, required: false, label: 'Opção 2', order: 6 },
  { id: 'message', enabled: true, required: false, label: 'Mensagem', order: 7 },
  { id: 'patient_name', enabled: false, required: false, label: 'Nome do paciente', order: 8 },
];

function normalizeFormFields(fields) {
  const list = Array.isArray(fields) ? fields : [];
  return list
    .filter((f) => f && f.id !== 'is_associate')
    .map((f) => {
      if (f.id !== 'option1') return { ...f };
      const options = Array.isArray(f.options) && f.options.length
        ? f.options.map((o) => String(o).trim()).filter(Boolean)
        : [...DEFAULT_OPTION1_OPTIONS];
      return { ...f, type: 'select', options };
    });
}

const DEFAULT_STATUSES = [
  {
    id: 'waiting',
    value: 'waiting',
    label: 'Espera',
    order: 1,
    is_default_entry: true,
    is_terminal: false,
    system: true,
  },
  {
    id: 'done',
    value: 'done',
    label: 'Concluído',
    order: 99,
    is_default_entry: false,
    is_terminal: true,
    system: true,
  },
];

function parseJson(raw, fallback) {
  if (raw == null || raw === '') return fallback;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return fallback;
  }
}

function parseBool(raw, fallback = false) {
  if (raw === undefined || raw === null || raw === '') return fallback;
  if (typeof raw === 'boolean') return raw;
  const s = String(raw).toLowerCase().trim();
  if (s === 'true' || s === '1' || s === 'yes') return true;
  if (s === 'false' || s === '0' || s === 'no') return false;
  return fallback;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function displayName(user) {
  const parts = [
    user.associate_name || user.name,
    user.associate_last_name || user.last_name,
  ].filter(Boolean);
  if (parts.length) return parts.join(' ').trim();
  return user.fullname || user.email || user.email_account || null;
}

async function loadTriageConfig() {
  const { values } = await systemConfigService.resolveAll('triage');
  return {
    formFields: normalizeFormFields(parseJson(values['triage.form.fields'], DEFAULT_FORM_FIELDS)),
    customFields: parseJson(values['triage.form.custom_fields'], []),
    statuses: parseJson(values['triage.statuses'], DEFAULT_STATUSES),
    associateDocs: parseBool(values['triage.module.associate_docs'], false),
    publicFormEnabled: parseBool(values['triage.public_form_enabled'], true),
  };
}

function getEntryStatus(statuses) {
  const entry = (statuses || []).find((s) => s.is_default_entry);
  return entry?.value || 'waiting';
}

function getTerminalStatus(statuses) {
  const terminal = (statuses || []).find((s) => s.is_terminal);
  return terminal?.value || 'done';
}

function enabledFields(cfg) {
  const standard = (cfg.formFields || [])
    .filter((f) => f && f.enabled !== false)
    .map((f) => ({ ...f, source: 'standard' }));
  const custom = (cfg.customFields || [])
    .filter((f) => f && f.enabled !== false)
    .map((f) => ({ ...f, source: 'custom' }));
  return [...standard, ...custom].sort((a, b) => (a.order || 0) - (b.order || 0));
}

async function getFormSchema() {
  const cfg = await loadTriageConfig();
  return {
    enabled: cfg.publicFormEnabled,
    fields: enabledFields(cfg),
    form_fields: cfg.formFields,
    custom_fields: cfg.customFields,
    statuses: cfg.statuses,
    associate_docs: cfg.associateDocs,
  };
}

async function findAssociateByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const result = await query(
    `SELECT id, user_code, associate_name, associate_last_name, fullname, email, email_account, avatar_url
     FROM users
     WHERE (lower(email) = $1 OR lower(email_account) = $1)
       AND (status IS NULL OR status <> 'patient')
     ORDER BY id DESC
     LIMIT 1`,
    [normalized],
  );
  return result.rows[0] || null;
}

async function findAssociateByCode(associateCode) {
  const code = String(associateCode || '').trim();
  if (!code) return null;
  const result = await query(
    `SELECT id, user_code, associate_name, associate_last_name, fullname, email, email_account, avatar_url
     FROM users
     WHERE user_code::text = $1
     LIMIT 1`,
    [code],
  );
  return result.rows[0] || null;
}

function isEmptyValue(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function coerceFieldValue(field, raw) {
  if (field.type === 'checkbox' || field.id === 'is_associate') {
    if (typeof raw === 'boolean') return raw;
    const s = String(raw).toLowerCase().trim();
    return s === 'true' || s === '1' || s === 'yes' || s === 'on' || s === 'sim';
  }
  return raw == null ? '' : String(raw).trim();
}

async function createPublicReception(payload = {}) {
  const cfg = await loadTriageConfig();
  if (!cfg.publicFormEnabled) {
    throw new AppError(403, 'FORM_DISABLED', 'Formulário público de triagem desabilitado');
  }

  const fields = enabledFields(cfg);
  const body = payload || {};
  const standard = {};
  const customValues = {};
  const errors = [];

  for (const field of fields) {
    const raw = body[field.id];
    const value = coerceFieldValue(field, raw);
    if (field.required && isEmptyValue(value) && value !== false) {
      errors.push(`Campo obrigatório: ${field.label || field.id}`);
      continue;
    }
    if (field.source === 'custom') {
      if (!isEmptyValue(value) || value === false || value === true) {
        customValues[field.id] = value;
      }
    } else if (STANDARD_FIELD_IDS.has(field.id)) {
      standard[field.id] = value;
    }
  }

  if (errors.length) {
    throw new AppError(400, 'VALIDATION_ERROR', errors[0], { errors });
  }

  const email = normalizeEmail(standard.email);
  if (email) standard.email = email;

  let associateCode = null;
  let associateName = null;
  let avatarUrl = null;
  if (email) {
    const user = await findAssociateByEmail(email);
    if (user) {
      associateCode = user.user_code || null;
      associateName = displayName(user);
      avatarUrl = user.avatar_url || null;
      if (standard.is_associate === undefined || standard.is_associate === '') {
        standard.is_associate = true;
      }
    }
  }

  const entryStatus = getEntryStatus(cfg.statuses);
  const fullName = [standard.name, standard.last_name].filter(Boolean).join(' ').trim() || null;

  const tags = {
    labels: [],
    custom_fields: customValues,
  };

  const created = await itemsRepository.createItem('reception', {
    name: standard.name || null,
    last_name: standard.last_name || null,
    full_name: fullName,
    email: email || null,
    phone: standard.phone || null,
    option1: standard.option1 || null,
    option2: standard.option2 || null,
    is_associate: Boolean(standard.is_associate),
    message: standard.message || null,
    patient_name: standard.patient_name || null,
    code: uuidv4(),
    status: entryStatus,
    associate_code: associateCode,
    associate_name: associateName,
    avatar_url: avatarUrl,
    tags,
    date_created: new Date().toISOString(),
  });

  await activityService.recordSafe({
    entity_type: 'reception',
    entity_id: String(created.id),
    entity_code: created.code || null,
    action: 'reception.created',
    actor_user_code: null,
    actor_name: 'Formulário público',
    summary: `Nova triagem criada: ${activityService.contactLabel(created)}`,
    metadata: {
      source: 'public',
      status: created.status,
      associate_code: created.associate_code || null,
    },
  });

  return created;
}

async function createReception(payload, actor = null) {
  const cfg = await loadTriageConfig();
  const created = await itemsRepository.createItem('reception', {
    ...payload,
    code: payload.code || uuidv4(),
    date_created: new Date().toISOString(),
    status: payload.status || getEntryStatus(cfg.statuses),
  });

  const actorFields = activityService.fromActor(actor);
  await activityService.recordSafe({
    entity_type: 'reception',
    entity_id: String(created.id),
    entity_code: created.code || null,
    action: 'reception.created',
    ...actorFields,
    summary: `${actorFields.actor_name} criou a triagem ${activityService.contactLabel(created)}`,
    metadata: {
      source: 'staff',
      status: created.status,
      associate_code: created.associate_code || null,
    },
  });

  return created;
}

async function complete(id, completionReason, actor = null) {
  if (!completionReason) {
    throw new AppError(400, 'VALIDATION_ERROR', 'completion_reason é obrigatório');
  }
  const before = await itemsRepository.getItem('reception', id);
  const cfg = await loadTriageConfig();
  const updated = await itemsRepository.updateItem('reception', id, {
    completion_reason: completionReason,
    status: getTerminalStatus(cfg.statuses),
    date_updated: new Date().toISOString(),
  });

  const actorFields = activityService.fromActor(actor);
  const relatedCode = before.attendant || null;
  const relatedName = relatedCode ? await activityService.resolveAttendantName(relatedCode) : null;
  await activityService.recordSafe({
    entity_type: 'reception',
    entity_id: String(updated.id),
    entity_code: updated.code || null,
    action: 'reception.completed',
    ...actorFields,
    ...activityService.relatedFrom({
      code: relatedCode && relatedCode !== actorFields.actor_user_code ? relatedCode : null,
      name: relatedCode && relatedCode !== actorFields.actor_user_code ? relatedName : null,
    }),
    summary: `${actorFields.actor_name} concluiu a triagem ${activityService.contactLabel(updated)} → ${completionReason}`,
    metadata: {
      completion_reason: completionReason,
      status_from: before.status || null,
      status_to: updated.status,
      associate_code: updated.associate_code || null,
      associate_name: updated.associate_name || null,
    },
  });

  return updated;
}

async function assignAttendant(id, attendant, actor = null) {
  // null / '' clears the attendant (legacy “remover”)
  if (attendant === undefined) {
    throw new AppError(400, 'VALIDATION_ERROR', 'attendant é obrigatório');
  }
  const value = attendant === null || attendant === '' ? null : String(attendant).trim();
  if (value === '') {
    throw new AppError(400, 'VALIDATION_ERROR', 'attendant inválido');
  }

  const before = await itemsRepository.getItem('reception', id);
  const updated = await itemsRepository.updateItem('reception', id, {
    attendant: value,
    date_updated: new Date().toISOString(),
  });

  const actorFields = activityService.fromActor(actor);
  const actorCode = actorFields.actor_user_code;
  const contact = activityService.contactLabel(updated);
  const associateHint = updated.associate_name
    ? ` (associado ${updated.associate_name})`
    : '';

  if (value == null) {
    const previous = before.attendant || null;
    const previousName = previous ? await activityService.resolveAttendantName(previous) : null;
    await activityService.recordSafe({
      entity_type: 'reception',
      entity_id: String(updated.id),
      entity_code: updated.code || null,
      action: 'reception.attendant_cleared',
      ...actorFields,
      ...activityService.relatedFrom({
        code: previous && previous !== actorCode ? previous : null,
        name: previous && previous !== actorCode ? previousName : null,
      }),
      summary: `${actorFields.actor_name} removeu o atendente da triagem ${contact}`,
      metadata: {
        previous_attendant: previous,
        associate_code: updated.associate_code || null,
      },
    });
  } else if (actorCode && value === actorCode) {
    await activityService.recordSafe({
      entity_type: 'reception',
      entity_id: String(updated.id),
      entity_code: updated.code || null,
      action: 'reception.assumed',
      ...actorFields,
      related_user_code: null,
      related_user_name: null,
      summary: `${actorFields.actor_name} assumiu a triagem ${contact}${associateHint}`,
      metadata: {
        attendant: value,
        previous_attendant: before.attendant || null,
        associate_code: updated.associate_code || null,
        associate_name: updated.associate_name || null,
      },
    });
  } else {
    const targetName = await activityService.resolveAttendantName(value);
    await activityService.recordSafe({
      entity_type: 'reception',
      entity_id: String(updated.id),
      entity_code: updated.code || null,
      action: 'reception.transferred',
      ...actorFields,
      ...activityService.relatedFrom({ code: value, name: targetName }),
      summary: `${actorFields.actor_name} transferiu o contato ${contact} para ${targetName}`,
      metadata: {
        attendant: value,
        previous_attendant: before.attendant || null,
        associate_code: updated.associate_code || null,
      },
    });
  }

  return updated;
}

const TRIAGE_ATTENDANT_ROLES = ['Administrador', 'Acolhimento', 'Produção'];

function parsePermissions(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    /* ignore */
  }
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function attendantCode(row) {
  return row.user_code || row.internal_code || (row.id != null ? String(row.id) : null);
}

/** Operators who can take triage contacts (no secrets). */
async function listAttendants() {
  const result = await query(
    `SELECT id, name, last_name, email, user_code, internal_code, avatar_url, permissions, status
     FROM system_users
     WHERE status IS NULL OR lower(status) <> 'inactive'
     ORDER BY name ASC NULLS LAST, last_name ASC NULLS LAST
     LIMIT 200`,
  );
  return result.rows
    .map((row) => {
      const permissions = parsePermissions(row.permissions);
      const code = attendantCode(row);
      return {
        id: row.id,
        code,
        user_code: row.user_code || null,
        internal_code: row.internal_code || null,
        name: row.name || '',
        last_name: row.last_name || '',
        email: row.email || null,
        avatar_url: row.avatar_url || null,
        permissions,
      };
    })
    .filter((u) => {
      if (!u.code) return false;
      return u.permissions.some((p) => TRIAGE_ATTENDANT_ROLES.includes(p));
    });
}

async function updateStatus(id, status, actor = null) {
  const value = String(status || '').trim();
  if (!value) throw new AppError(400, 'VALIDATION_ERROR', 'status é obrigatório');
  const cfg = await loadTriageConfig();
  const allowed = new Set((cfg.statuses || []).map((s) => s.value));
  if (!allowed.has(value)) {
    throw new AppError(400, 'VALIDATION_ERROR', `Status inválido: ${value}`);
  }
  const before = await itemsRepository.getItem('reception', id);
  const updated = await itemsRepository.updateItem('reception', id, {
    status: value,
    date_updated: new Date().toISOString(),
  });

  const actorFields = activityService.fromActor(actor);
  const toLabel = (cfg.statuses || []).find((s) => s.value === value)?.label || value;
  const fromLabel = (cfg.statuses || []).find((s) => s.value === before.status)?.label || before.status || '—';
  const relatedCode = before.attendant || null;
  const relatedName = relatedCode ? await activityService.resolveAttendantName(relatedCode) : null;

  await activityService.recordSafe({
    entity_type: 'reception',
    entity_id: String(updated.id),
    entity_code: updated.code || null,
    action: 'reception.status_changed',
    ...actorFields,
    ...activityService.relatedFrom({
      code: relatedCode && relatedCode !== actorFields.actor_user_code ? relatedCode : null,
      name: relatedCode && relatedCode !== actorFields.actor_user_code ? relatedName : null,
    }),
    summary: `${actorFields.actor_name} mudou o status de ${activityService.contactLabel(updated)} para ${toLabel}`,
    metadata: {
      status_from: before.status || null,
      status_to: value,
      status_from_label: fromLabel,
      status_to_label: toLabel,
    },
  });

  return updated;
}

async function linkAssociate(id, associateCode, actor = null) {
  const code = String(associateCode || '').trim();
  if (!code) throw new AppError(400, 'VALIDATION_ERROR', 'associate_code é obrigatório');
  const user = await findAssociateByCode(code);
  if (!user) throw new AppError(404, 'NOT_FOUND', 'Associado não encontrado');
  const updated = await itemsRepository.updateItem('reception', id, {
    associate_code: user.user_code,
    associate_name: displayName(user),
    avatar_url: user.avatar_url || null,
    is_associate: true,
    date_updated: new Date().toISOString(),
  });

  const actorFields = activityService.fromActor(actor);
  const assocName = displayName(user);
  await activityService.recordSafe({
    entity_type: 'reception',
    entity_id: String(updated.id),
    entity_code: updated.code || null,
    action: 'reception.linked',
    ...actorFields,
    related_user_code: updated.attendant && updated.attendant !== actorFields.actor_user_code
      ? updated.attendant
      : null,
    related_user_name: updated.attendant && updated.attendant !== actorFields.actor_user_code
      ? await activityService.resolveAttendantName(updated.attendant)
      : null,
    summary: `${actorFields.actor_name} linkou o associado ${assocName} na triagem ${activityService.contactLabel(updated)}`,
    metadata: {
      associate_code: user.user_code,
      associate_name: assocName,
    },
  });

  return updated;
}

async function unlinkAssociate(id, actor = null) {
  const before = await itemsRepository.getItem('reception', id);
  const updated = await itemsRepository.updateItem('reception', id, {
    associate_code: null,
    associate_name: null,
    date_updated: new Date().toISOString(),
  });

  const actorFields = activityService.fromActor(actor);
  await activityService.recordSafe({
    entity_type: 'reception',
    entity_id: String(updated.id),
    entity_code: updated.code || null,
    action: 'reception.unlinked',
    ...actorFields,
    related_user_code: before.attendant && before.attendant !== actorFields.actor_user_code
      ? before.attendant
      : null,
    related_user_name: before.attendant && before.attendant !== actorFields.actor_user_code
      ? await activityService.resolveAttendantName(before.attendant)
      : null,
    summary: `${actorFields.actor_name} desvinculou o associado da triagem ${activityService.contactLabel(before)}`,
    metadata: {
      previous_associate_code: before.associate_code || null,
      previous_associate_name: before.associate_name || null,
    },
  });

  return updated;
}

async function statusCounts() {
  const result = await query(
    `SELECT COALESCE(status, '') AS status, COUNT(*)::int AS count
     FROM reception
     GROUP BY COALESCE(status, '')`,
  );
  const counts = {};
  for (const row of result.rows) {
    counts[row.status || ''] = row.count;
  }
  return counts;
}

async function completeOpenByAssociate({ email, associate_code, completion_reason, actor = null }) {
  if (!completion_reason) {
    throw new AppError(400, 'VALIDATION_ERROR', 'completion_reason é obrigatório');
  }
  const cfg = await loadTriageConfig();
  const terminal = getTerminalStatus(cfg.statuses);
  const normalized = normalizeEmail(email);
  const code = associate_code ? String(associate_code).trim() : null;

  if (!normalized && !code) {
    return { updated: 0, ids: [] };
  }

  const clauses = [];
  const params = [];
  if (normalized) {
    params.push(normalized);
    clauses.push(`lower(email) = $${params.length}`);
  }
  if (code) {
    params.push(code);
    clauses.push(`associate_code::text = $${params.length}`);
  }
  params.push(terminal);

  const result = await query(
    `UPDATE reception
     SET status = $${params.length},
         completion_reason = $${params.length + 1},
         date_updated = NOW()
     WHERE status IS DISTINCT FROM $${params.length}
       AND (${clauses.join(' OR ')})
     RETURNING *`,
    [...params, completion_reason],
  );

  const actorFields = activityService.fromActor(actor);
  for (const row of result.rows) {
    await activityService.recordSafe({
      entity_type: 'reception',
      entity_id: String(row.id),
      entity_code: row.code || null,
      action: 'reception.completed',
      ...actorFields,
      related_user_code: row.attendant && row.attendant !== actorFields.actor_user_code
        ? row.attendant
        : null,
      related_user_name: row.attendant && row.attendant !== actorFields.actor_user_code
        ? await activityService.resolveAttendantName(row.attendant)
        : null,
      summary: `${actorFields.actor_name} concluiu a triagem ${activityService.contactLabel(row)} → ${completion_reason}`,
      metadata: {
        completion_reason,
        source: 'completeOpenByAssociate',
        status_to: terminal,
        associate_code: row.associate_code || null,
      },
    });
  }

  return { updated: result.rows.length, ids: result.rows.map((r) => r.id) };
}

module.exports = {
  createReception,
  createPublicReception,
  getFormSchema,
  complete,
  assignAttendant,
  updateStatus,
  linkAssociate,
  unlinkAssociate,
  statusCounts,
  completeOpenByAssociate,
  loadTriageConfig,
  listAttendants,
};
