import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { createApiClient } from '@kunk/api-client';
import { getKunkPublicConfig } from '@kunk/config';
import { useErrorModal } from '../components/errors/ErrorModalProvider.jsx';
import PhoneField from '../components/PhoneField.jsx';
import { contentAreaDialogProps, contentAreaSelectProps } from '../layout/contentAreaOverlay.js';
import { typeLabel, resolvePriceFromType, normalizeProfessionalTypeId } from './reception/services/servicesUtils.js';

const muiTheme = createTheme();
const GREEN = '#5a7a5b';

const EMPTY = {
  name: '',
  last_name: '',
  email: '',
  phone: '',
  cpf: '',
  state: '',
  city: '',
  type: '',
  specialty: '',
  consultation_price: '',
  is_collaborator: false,
  is_prescriber: false,
  active: true,
  calendar_id: '',
};

export default function ProfessionalsPage() {
  const bootstrap = getKunkPublicConfig();
  const api = useMemo(() => createApiClient({ baseUrl: bootstrap.apiUrl, app: 'kunk' }), [bootstrap.apiUrl]);
  const { showError } = useErrorModal();

  const [rows, setRows] = useState([]);
  const [role, setRole] = useState('all');
  const [q, setQ] = useState('');
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [calendars, setCalendars] = useState([]);
  const [primaryId, setPrimaryId] = useState(null);
  const [googleCalendarEnabled, setGoogleCalendarEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [professionalTypes, setProfessionalTypes] = useState([]);
  const [inviteInfo, setInviteInfo] = useState(null);

  const typeOptions = useMemo(() => {
    return (professionalTypes || []).filter((t) => t.active !== false);
  }, [professionalTypes]);

  const load = useCallback(async () => {
    try {
      const params = { enrich_calendar: true, q: q || undefined };
      if (role === 'collaborators') params.role = 'collaborators';
      if (role === 'prescribers') params.role = 'prescribers';
      if (role === 'both') params.role = 'both';
      const res = await api.listProfessionals(params);
      setRows(res.data || []);
    } catch (err) {
      showError(err);
    }
  }, [api, q, role, showError]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const [cals, status, typesRes] = await Promise.all([
          api.listGoogleCalendars().catch(() => ({ data: [] })),
          api.getGoogleCalendarStatus().catch(() => ({ data: {} })),
          api.getProfessionalTypes().catch(() => ({ data: [] })),
        ]);
        setCalendars(cals.data || []);
        setPrimaryId(status.data?.primary_calendar_id || null);
        setGoogleCalendarEnabled(Boolean(status.data?.enabled));
        setProfessionalTypes(Array.isArray(typesRes.data) ? typesRes.data : []);
      } catch {
        /* module off */
        setGoogleCalendarEnabled(false);
      }
    })();
  }, [api]);

  function openNew() {
    const firstType = typeOptions[0]?.id || '';
    const typeCfg = professionalTypes.find((t) => t.id === firstType);
    setForm({
      ...EMPTY,
      type: firstType,
      consultation_price:
        typeCfg?.default_consultation_price != null ? String(typeCfg.default_consultation_price) : '',
    });
    setDialog({ mode: 'new' });
  }

  function openEdit(row) {
    const normalizedType =
      normalizeProfessionalTypeId(row.type) || typeOptions[0]?.id || '';
    setForm({
      name: row.name || '',
      last_name: row.last_name || '',
      email: row.email || '',
      phone: row.phone || '',
      cpf: row.cpf || '',
      state: row.state || '',
      city: row.city || '',
      type: normalizedType,
      specialty: row.specialty || '',
      consultation_price: row.consultation_price ?? '',
      is_collaborator:
        row.is_collaborator === true ||
        String(row.is_collaborator).toLowerCase() === 'true' ||
        row.is_collaborator === 'Sim',
      is_prescriber:
        row.is_prescriber === true ||
        String(row.is_prescriber).toLowerCase() === 'true' ||
        row.is_prescriber === 'Sim',
      active: row.active !== 0 && row.active !== false,
      calendar_id: row.calendar_id || '',
    });
    setDialog({ mode: 'edit', id: row.id });
  }

  async function onSave() {
    setBusy(true);
    try {
      const body = {
        ...form,
        consultation_price:
          form.consultation_price === '' ? 0 : Number(form.consultation_price) || 0,
        active: form.active ? 1 : 0,
        calendar_id: googleCalendarEnabled ? form.calendar_id || null : null,
      };
      if (dialog.mode === 'new') await api.createProfessional(body);
      else await api.updateProfessional(dialog.id, body);
      setDialog(null);
      load();
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  }

  async function onSoftDelete(row) {
    if (!window.confirm(`Desativar ${row.name}?`)) return;
    try {
      await api.deleteProfessional(row.id);
      load();
    } catch (err) {
      showError(err);
    }
  }

  async function onCreatePortalAccess(row, resend = false) {
    try {
      setBusy(true);
      const res = resend
        ? await api.resendProfessionalPortalAccess(row.id)
        : await api.createProfessionalPortalAccess(row.id);
      setInviteInfo({
        name: `${row.name || ''} ${row.last_name || ''}`.trim(),
        ...(res.data || {}),
      });
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  }

  async function copyInviteLink() {
    if (!inviteInfo?.invite_url) return;
    try {
      await navigator.clipboard.writeText(inviteInfo.invite_url);
    } catch {
      /* ignore */
    }
  }

  const secondaryCalendars = calendars.filter((c) => c.id !== primaryId);

  return (
    <ThemeProvider theme={muiTheme}>
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
          <TextField size="small" label="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
          {[
            ['all', 'Todos'],
            ['collaborators', 'Colaboradores'],
            ['prescribers', 'Prescritores'],
            ['both', 'Ambos'],
          ].map(([id, label]) => (
            <Chip
              key={id}
              label={label}
              color={role === id ? 'success' : 'default'}
              onClick={() => setRole(id)}
              sx={role === id ? { bgcolor: GREEN, color: '#fff' } : undefined}
            />
          ))}
          <Button variant="contained" sx={{ bgcolor: GREEN }} onClick={openNew}>
            Novo profissional
          </Button>
        </Box>

        <TableContainer component={Paper} elevation={0}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: GREEN }}>
                {['Nome', 'Tipo', 'Papéis', 'Valor', ...(googleCalendarEnabled ? ['Agenda'] : []), 'Ativo', ''].map((h) => (
                  <TableCell key={h || 'actions'} sx={{ color: '#fff', fontWeight: 600 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const collab =
                  row.is_collaborator === true ||
                  String(row.is_collaborator).toLowerCase() === 'true' ||
                  row.is_collaborator === 'Sim';
                const presc =
                  row.is_prescriber === true ||
                  String(row.is_prescriber).toLowerCase() === 'true' ||
                  row.is_prescriber === 'Sim';
                return (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      {row.name} {row.last_name}
                    </TableCell>
                    <TableCell>{typeLabel(row.type, professionalTypes)}</TableCell>
                    <TableCell>
                      {collab && <Chip size="small" label="Colaborador" sx={{ mr: 0.5 }} />}
                      {presc && <Chip size="small" label="Prescritor" />}
                    </TableCell>
                    <TableCell>{row.consultation_price ?? '—'}</TableCell>
                    {googleCalendarEnabled ? (
                      <TableCell>{row.calendar?.summary || row.calendar_id || '—'}</TableCell>
                    ) : null}
                    <TableCell>{row.active === 0 ? 'Não' : 'Sim'}</TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => openEdit(row)}>
                        Editar
                      </Button>
                      {collab && (
                        <Button
                          size="small"
                          disabled={busy}
                          onClick={() => onCreatePortalAccess(row, false)}
                        >
                          Criar conta
                        </Button>
                      )}
                      {collab && (
                        <Button
                          size="small"
                          disabled={busy}
                          onClick={() => onCreatePortalAccess(row, true)}
                        >
                          Reenviar convite
                        </Button>
                      )}
                      <Button size="small" color="error" onClick={() => onSoftDelete(row)}>
                        Desativar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} maxWidth="sm" fullWidth {...contentAreaDialogProps}>
        <DialogTitle>{dialog?.mode === 'new' ? 'Novo profissional' : 'Editar profissional'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gap: 1.5, mt: 1 }}>
            <TextField
              label="Nome"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <TextField
              label="Sobrenome"
              value={form.last_name}
              onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
            />
            <TextField
              label="E-mail"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <PhoneField
              label="Telefone"
              name="phone"
              value={form.phone}
              onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
            />
            <TextField
              select
              label="Tipo"
              value={form.type}
              disabled={!typeOptions.length}
              SelectProps={contentAreaSelectProps}
              helperText={
                typeOptions.length
                  ? 'Catálogo do Admin → Tipos de serviços'
                  : 'Nenhum tipo ativo no admin. Cadastre em Tipos de serviços.'
              }
              onChange={(e) => {
                const nextType = e.target.value;
                const cfg = professionalTypes.find((t) => t.id === nextType);
                setForm((f) => ({
                  ...f,
                  type: nextType,
                  consultation_price:
                    cfg?.default_consultation_price != null
                      ? String(cfg.default_consultation_price)
                      : f.consultation_price,
                }));
              }}
            >
              {typeOptions.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Valor consulta"
              type="number"
              value={form.consultation_price}
              onChange={(e) => setForm((f) => ({ ...f, consultation_price: e.target.value }))}
              helperText={
                resolvePriceFromType(form.type, professionalTypes) != null
                  ? `Padrão do tipo no admin: R$ ${resolvePriceFromType(form.type, professionalTypes)}`
                  : 'Sem preço padrão no tipo — usa este valor no create do serviço'
              }
            />
            {googleCalendarEnabled ? (
              <TextField
                select
                label="Agenda secundária (Google)"
                value={form.calendar_id}
                onChange={(e) => setForm((f) => ({ ...f, calendar_id: e.target.value }))}
                SelectProps={contentAreaSelectProps}
                helperText={
                  secondaryCalendars.length
                    ? 'Não use o calendário principal da associação'
                    : 'Configure Google Calendar em Serviços externos'
                }
              >
                <MenuItem value="">—</MenuItem>
                {secondaryCalendars.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.summary}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.is_collaborator}
                  onChange={(e) => setForm((f) => ({ ...f, is_collaborator: e.target.checked }))}
                />
              }
              label="Colaborador — mostrar em Serviços"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.is_prescriber}
                  onChange={(e) => setForm((f) => ({ ...f, is_prescriber: e.target.checked }))}
                />
              }
              label="Prescritor — receitas / pedidos"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                />
              }
              label="Ativo"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Cancelar</Button>
          <Button variant="contained" disabled={busy} onClick={onSave} sx={{ bgcolor: GREEN }}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(inviteInfo)} onClose={() => setInviteInfo(null)} maxWidth="sm" fullWidth {...contentAreaDialogProps}>
        <DialogTitle>Convite — {inviteInfo?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            E-mail automático ainda não configurado ({inviteInfo?.email_status || 'module_not_configured'}).
            Copie o link e envie ao profissional. Expira em{' '}
            {inviteInfo?.expires_at
              ? new Date(inviteInfo.expires_at).toLocaleString('pt-BR')
              : '—'}.
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={2}
            value={inviteInfo?.invite_url || ''}
            InputProps={{ readOnly: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteInfo(null)}>Fechar</Button>
          <Button variant="contained" onClick={copyInviteLink} sx={{ bgcolor: GREEN }}>
            Copiar link
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}
