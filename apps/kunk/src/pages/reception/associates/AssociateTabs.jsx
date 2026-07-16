import React, { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import { normalizeCiapCodes, PhoneInput, serializeCiapCodes } from '@kunk/forms';
import Ciap2Field from '../../../components/ciap2/Ciap2Field.jsx';
import { displayName, contentAreaDialogSx } from './associatesStatus.js';

const GREEN = '#5a7a5b';

const FULL_WIDTH_KEYS = new Set(['reason_treatment_text']);

/** Alinhado a @kunk/forms (cadastramento). */
const GENDER_OPTIONS = [
  { value: 'homem-cis', label: 'Homem cis' },
  { value: 'mulher-cis', label: 'Mulher cis' },
  { value: 'homem-trans', label: 'Homem trans' },
  { value: 'mulher-trans', label: 'Mulher trans' },
  { value: 'travesti', label: 'Travesti' },
  { value: 'nao-binario', label: 'Não-binário' },
  { value: 'outro', label: 'Outro' },
];

const MARITAL_OPTIONS = ['Solteiro', 'Casado', 'União-Estável', 'Viúvo', 'Divorciado'];

const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const PERSON_FIELDS = [
  ['associate_name', 'Nome'],
  ['associate_last_name', 'Sobrenome'],
  ['associate_cpf', 'CPF'],
  ['associate_rg', 'RG'],
  ['associate_birth_date', 'Nascimento'],
  ['gender', 'Gênero'],
  ['nationality', 'Nacionalidade'],
  ['marital_status', 'Estado civil'],
  ['mobile_number', 'Telefone'],
  ['email_account', 'E-mail'],
  ['street', 'Rua'],
  ['street_number', 'Número'],
  ['neighborhood', 'Bairro'],
  ['city', 'Cidade'],
  ['state', 'UF'],
  ['cep', 'CEP'],
  ['reason_treatment_text', 'Motivo do tratamento'],
];

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function formatCpf(value) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatCep(value) {
  const d = onlyDigits(value).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function normalizeMarital(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const found = MARITAL_OPTIONS.find(
    (o) => o.toLowerCase() === raw.toLowerCase() || o.toLowerCase().replace(/-/g, ' ') === raw.toLowerCase().replace(/-/g, ' ')
  );
  return found || raw;
}

function emptyPersonForm() {
  return {
    ...Object.fromEntries(PERSON_FIELDS.map(([key]) => [key, ''])),
    ciap_codes: [],
  };
}

function personFormFromRecord(record) {
  const form = emptyPersonForm();
  if (!record) return form;
  for (const [key] of PERSON_FIELDS) {
    const value = record[key];
    if (key === 'mobile_number' || key === 'associate_cpf') {
      form[key] = value == null ? '' : onlyDigits(value);
    } else {
      form[key] = value == null ? '' : String(value);
    }
  }
  // birth_date as YYYY-MM-DD for <input type="date">
  if (form.associate_birth_date) {
    form.associate_birth_date = form.associate_birth_date.slice(0, 10);
  }
  form.ciap_codes = normalizeCiapCodes(record.ciap_codes);
  return form;
}

/** Only editable person columns — never spread full user (e.g. hydrated `patients`). */
function personPayload(form, { ciap2Enabled }) {
  const out = {};
  for (const [key] of PERSON_FIELDS) {
    const raw = form[key];
    if (raw === '' || raw == null) {
      out[key] = null;
      continue;
    }
    if (key === 'associate_cpf') {
      out[key] = onlyDigits(raw) || null;
    } else if (key === 'mobile_number') {
      out[key] = onlyDigits(raw) || null;
    } else if (key === 'cep') {
      out[key] = formatCep(raw) || null;
    } else {
      out[key] = raw;
    }
  }
  // Keep login email in sync with contact email when present in schema.
  if (out.email_account != null) {
    out.email = out.email_account;
  }
  if (ciap2Enabled) {
    out.ciap_codes = serializeCiapCodes(form.ciap_codes) || null;
  }
  return out;
}

function PersonFieldsGrid({ form, onChange }) {
  const genderValue = String(form.gender || '');
  const genderKnownExact = GENDER_OPTIONS.some((o) => o.value === genderValue);
  const genderSelectValue = genderKnownExact ? genderValue : genderValue ? 'outro' : '';
  const showGenderOther = genderSelectValue === 'outro';
  const genderOtherText = genderKnownExact ? '' : genderValue;
  const maritalValue = normalizeMarital(form.marital_status);
  const maritalKnown = !maritalValue || MARITAL_OPTIONS.includes(maritalValue);
  const stateValue = String(form.state || '').toUpperCase();
  const stateKnown = !stateValue || UF_OPTIONS.includes(stateValue);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 1.5,
      }}
    >
      {PERSON_FIELDS.map(([key, label]) => {
        const fullWidthSx = FULL_WIDTH_KEYS.has(key) ? { gridColumn: '1 / -1' } : undefined;

        if (key === 'mobile_number') {
          return (
            <Box
              key={key}
              sx={{
                '& .kunk-phone-input': { width: '100%' },
                '& .kunk-phone-input .form-control': {
                  width: '100% !important',
                  height: '40px !important',
                  fontSize: '0.875rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(0, 0, 0, 0.23)',
                  paddingLeft: '48px',
                },
                '& .kunk-phone-input .form-control:focus': {
                  borderColor: GREEN,
                  outline: 'none',
                  boxShadow: `0 0 0 1px ${GREEN}`,
                },
                '& .kunk-phone-flag-btn': {
                  borderRadius: '4px 0 0 4px',
                  border: '1px solid rgba(0, 0, 0, 0.23)',
                  background: '#fff',
                },
                '& .kunk-phone-dropdown': {
                  zIndex: 1400,
                },
              }}
            >
              <PhoneInput
                value={form[key] || ''}
                onChange={(v) => onChange(key, v)}
                inputProps={{
                  name: 'mobile_number',
                  autoComplete: 'tel',
                  'aria-label': label,
                  placeholder: label,
                }}
              />
            </Box>
          );
        }

        if (key === 'associate_cpf') {
          return (
            <TextField
              key={key}
              label={label}
              size="small"
              fullWidth
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={formatCpf(form[key])}
              onChange={(e) => onChange(key, onlyDigits(e.target.value).slice(0, 11))}
              sx={fullWidthSx}
            />
          );
        }

        if (key === 'cep') {
          return (
            <TextField
              key={key}
              label={label}
              size="small"
              fullWidth
              inputMode="numeric"
              placeholder="00000-000"
              value={formatCep(form[key])}
              onChange={(e) => onChange(key, formatCep(e.target.value))}
              sx={fullWidthSx}
            />
          );
        }

        if (key === 'gender') {
          return (
            <React.Fragment key={key}>
              <TextField
                select
                label={label}
                size="small"
                fullWidth
                value={genderSelectValue}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next === 'outro') onChange('gender', genderOtherText || 'outro');
                  else onChange('gender', next);
                }}
              >
                <MenuItem value="">Selecione</MenuItem>
                {GENDER_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
              {showGenderOther ? (
                <TextField
                  label="Descreva o gênero"
                  size="small"
                  fullWidth
                  value={genderOtherText}
                  onChange={(e) => onChange('gender', e.target.value || 'outro')}
                  placeholder="Descreva"
                />
              ) : null}
            </React.Fragment>
          );
        }

        if (key === 'marital_status') {
          return (
            <TextField
              key={key}
              select
              label={label}
              size="small"
              fullWidth
              value={maritalValue}
              onChange={(e) => onChange(key, e.target.value)}
              sx={fullWidthSx}
            >
              <MenuItem value="">Selecione</MenuItem>
              {MARITAL_OPTIONS.map((o) => (
                <MenuItem key={o} value={o}>
                  {o}
                </MenuItem>
              ))}
              {!maritalKnown ? <MenuItem value={maritalValue}>{maritalValue}</MenuItem> : null}
            </TextField>
          );
        }

        if (key === 'state') {
          return (
            <TextField
              key={key}
              select
              label={label}
              size="small"
              fullWidth
              value={stateValue}
              onChange={(e) => onChange(key, e.target.value)}
              sx={fullWidthSx}
            >
              <MenuItem value="">UF</MenuItem>
              {UF_OPTIONS.map((uf) => (
                <MenuItem key={uf} value={uf}>
                  {uf}
                </MenuItem>
              ))}
              {!stateKnown ? <MenuItem value={stateValue}>{stateValue}</MenuItem> : null}
            </TextField>
          );
        }

        if (key === 'associate_birth_date') {
          return (
            <TextField
              key={key}
              label={label}
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={String(form[key] || '').slice(0, 10)}
              onChange={(e) => onChange(key, e.target.value)}
              sx={fullWidthSx}
            />
          );
        }

        return (
          <TextField
            key={key}
            label={label}
            size="small"
            fullWidth
            value={form[key] ?? ''}
            onChange={(e) => onChange(key, e.target.value)}
            multiline={key === 'reason_treatment_text'}
            minRows={key === 'reason_treatment_text' ? 2 : 1}
            sx={fullWidthSx}
          />
        );
      })}
    </Box>
  );
}

export function PersonalDataTab({ user, onSave, onDelete, busy, ciap2Enabled = true }) {
  const [form, setForm] = useState(() => emptyPersonForm());
  useEffect(() => {
    setForm(personFormFromRecord(user));
  }, [user]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, pt: 1 }}>
      <Box sx={{ flex: 1, overflow: 'auto', pr: 0.5, pb: 2 }}>
        <Box sx={{ mb: 2.5 }}>
          <PersonFieldsGrid
            form={form}
            onChange={(key, value) => setForm((prev) => ({ ...prev, [key]: value }))}
          />
        </Box>
        {ciap2Enabled ? (
          <Box sx={{ mb: 2.5 }}>
            <Ciap2Field
              value={form.ciap_codes}
              onChange={(codes) => setForm((prev) => ({ ...prev, ciap_codes: codes }))}
              disabled={busy}
            />
          </Box>
        ) : null}
        <Box sx={{ pt: 1, mt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button color="error" disabled={busy} onClick={onDelete}>
            Excluir associado
          </Button>
        </Box>
      </Box>
      <Stack
        direction="row"
        justifyContent="flex-end"
        alignItems="center"
        sx={{
          pt: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          flexShrink: 0,
        }}
      >
        <Button
          variant="contained"
          disabled={busy}
          startIcon={<SaveIcon />}
          onClick={() => onSave(personPayload(form, { ciap2Enabled }))}
          sx={{ bgcolor: GREEN, '&:hover': { bgcolor: '#303B30' } }}
        >
          Salvar
        </Button>
      </Stack>
    </Box>
  );
}

export function PatientsTab({ patients, onCreate, onSave, onDelete, busy, ciap2Enabled = true }) {
  const [draft, setDraft] = useState(() => emptyPersonForm());
  const [editing, setEditing] = useState({});
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    setEditing({});
  }, [patients]);

  function patchDraft(key, value) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function patchEditing(patientId, base, key, value) {
    setEditing((prev) => ({
      ...prev,
      [patientId]: { ...(prev[patientId] || personFormFromRecord(base)), [key]: value },
    }));
  }

  function closeNewForm() {
    setShowNewForm(false);
    setDraft(emptyPersonForm());
  }

  return (
    <Box sx={{ pt: 2 }}>
      {showNewForm ? (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
            Novo paciente
          </Typography>
          <Box sx={{ mb: 2 }}>
            <PersonFieldsGrid form={draft} onChange={patchDraft} />
          </Box>
          {ciap2Enabled ? (
            <Box sx={{ mb: 2 }}>
              <Ciap2Field
                value={draft.ciap_codes}
                onChange={(codes) => setDraft((prev) => ({ ...prev, ciap_codes: codes }))}
                disabled={busy}
              />
            </Box>
          ) : null}
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button variant="outlined" disabled={busy} onClick={closeNewForm}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              disabled={busy || !String(draft.associate_name || '').trim()}
              startIcon={<SaveIcon />}
              onClick={async () => {
                try {
                  await onCreate(personPayload(draft, { ciap2Enabled }));
                  closeNewForm();
                } catch {
                  /* parent sets msg */
                }
              }}
              sx={{ bgcolor: GREEN, '&:hover': { bgcolor: '#303B30' } }}
            >
              Adicionar paciente
            </Button>
          </Stack>
        </Box>
      ) : (
        <Button
          variant="contained"
          onClick={() => setShowNewForm(true)}
          sx={{ mb: 3, bgcolor: GREEN, '&:hover': { bgcolor: '#303B30' } }}
        >
          Cadastrar novo paciente
        </Button>
      )}

      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
        Pacientes cadastrados
      </Typography>
      {(patients || []).length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Nenhum paciente vinculado.
        </Typography>
      ) : (
        (patients || []).map((p) => {
          const base = personFormFromRecord(p);
          const form = { ...base, ...(editing[p.id] || {}) };
          return (
            <Accordion
              key={p.id}
              disableGutters
              sx={{
                mb: 1,
                border: '1px solid #ddd',
                borderRadius: 1,
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight={600}>{displayName(p)}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ mb: 2 }}>
                  <PersonFieldsGrid
                    form={form}
                    onChange={(key, value) => patchEditing(p.id, p, key, value)}
                  />
                </Box>
                {ciap2Enabled ? (
                  <Box sx={{ mb: 2 }}>
                    <Ciap2Field
                      value={form.ciap_codes}
                      onChange={(codes) => patchEditing(p.id, p, 'ciap_codes', codes)}
                      disabled={busy}
                    />
                  </Box>
                ) : null}
                <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={busy}
                    startIcon={<SaveIcon />}
                    onClick={() => onSave(p.id, personPayload(form, { ciap2Enabled }))}
                    sx={{ bgcolor: GREEN, '&:hover': { bgcolor: '#303B30' } }}
                  >
                    Salvar
                  </Button>
                </Stack>
                <Box sx={{ pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Button size="small" color="error" onClick={() => onDelete(p.id)} disabled={busy}>
                    Excluir paciente
                  </Button>
                </Box>
              </AccordionDetails>
            </Accordion>
          );
        })
      )}
    </Box>
  );
}

export function PrescriberTab({ user, onSave, busy, FileUpload, api }) {
  const [prescriber, setPrescriber] = useState('');
  const [prescriberCode, setPrescriberCode] = useState('');
  const [datePrescription, setDatePrescription] = useState('');

  useEffect(() => {
    setPrescriber(user?.prescriber || '');
    setPrescriberCode(user?.prescriber_code || '');
    setDatePrescription(user?.date_prescription ? String(user.date_prescription).slice(0, 10) : '');
  }, [user]);

  return (
    <Box sx={{ pt: 3 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        <Box
          sx={{
            border: '1px solid #e0e0e0',
            borderRadius: 2,
            p: 2,
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
            Prescritor
          </Typography>
          <Stack spacing={1.5}>
            <TextField
              label="Prescritor (texto livre)"
              size="small"
              fullWidth
              value={prescriber}
              onChange={(e) => setPrescriber(e.target.value)}
            />
            <TextField
              label="Código do prescritor (opcional)"
              size="small"
              fullWidth
              value={prescriberCode}
              onChange={(e) => setPrescriberCode(e.target.value)}
            />
            <Button
              variant="contained"
              disabled={busy}
              startIcon={<SaveIcon />}
              onClick={() =>
                onSave({
                  prescriber,
                  prescriber_code: prescriberCode || null,
                  date_prescription: datePrescription || null,
                })
              }
              sx={{ bgcolor: GREEN, alignSelf: 'flex-end', '&:hover': { bgcolor: '#303B30' } }}
            >
              Salvar prescritor
            </Button>
          </Stack>
        </Box>

        <Box
          sx={{
            border: '1px solid #e0e0e0',
            borderRadius: 2,
            p: 2,
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
            Receita
          </Typography>
          <TextField
            label="Data da receita"
            type="date"
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={datePrescription}
            onChange={(e) => setDatePrescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          {FileUpload && user ? <FileUpload api={api} user={user} kind="prescription" /> : null}
        </Box>
      </Box>
    </Box>
  );
}

export function AnnotationsTab({ annotations, onAdd, onRemove, busy, operatorName }) {
  const [text, setText] = useState('');
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          label="Nova anotação"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button
          variant="contained"
          disabled={busy || !text.trim()}
          onClick={() => {
            onAdd({
              id: `${Date.now()}`,
              text: text.trim(),
              date_created: new Date().toISOString(),
              userName: operatorName || 'Operador',
            });
            setText('');
          }}
          sx={{ bgcolor: GREEN }}
        >
          Adicionar
        </Button>
      </Stack>
      {(annotations || []).map((a) => (
        <Box key={a.id} sx={{ borderBottom: '1px solid #eee', py: 1 }}>
          <Typography variant="body2">{a.text}</Typography>
          <Typography variant="caption" color="text.secondary">
            {a.userName} · {a.date_created ? new Date(a.date_created).toLocaleString('pt-BR') : ''}
          </Typography>
          <Button size="small" color="error" onClick={() => onRemove(a.id)} disabled={busy}>
            Excluir
          </Button>
        </Box>
      ))}
    </Box>
  );
}

export function HistoryTab({ history }) {
  const orders = history?.orders || [];
  const services = history?.services || [];
  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
        Pedidos
      </Typography>
      {orders.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Nenhum pedido
        </Typography>
      ) : (
        orders.map((o) => (
          <Typography key={o.id} variant="body2" sx={{ mb: 0.5 }}>
            {o.created_date || o.date_created} · {o.status} · {o.associate_name} · total {o.total}
          </Typography>
        ))
      )}
      <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 2, mb: 1 }}>
        Serviços
      </Typography>
      {services.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Nenhum serviço
        </Typography>
      ) : (
        services.map((s) => (
          <Typography key={s.id} variant="body2" sx={{ mb: 0.5 }}>
            {s.consultation_date || s.date_created} · {s.professional_name} · {s.patient_name || s.associate_name} ·{' '}
            {s.price}
          </Typography>
        ))
      )}
    </Box>
  );
}

export function TermStubMenu({ onNewTerm, onCopyLink, canCreate }) {
  return (
    <>
      <MenuItem onClick={onNewTerm} disabled={!canCreate}>
        Novo Termo
      </MenuItem>
      <MenuItem onClick={onCopyLink}>Copiar link do Termo</MenuItem>
    </>
  );
}

export function ConfirmDialog({ open, title, onClose, onConfirm }) {
  return (
    <Dialog open={open} onClose={onClose} sx={contentAreaDialogSx}>
      <DialogTitle>{title}</DialogTitle>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button color="error" variant="contained" onClick={onConfirm}>
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
