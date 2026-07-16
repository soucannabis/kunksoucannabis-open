import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoIcon from '@mui/icons-material/Info';
import EventIcon from '@mui/icons-material/Event';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PaymentIcon from '@mui/icons-material/Payment';
import { useSearchParams } from 'react-router-dom';
import { createApiClient } from '@kunk/api-client';
import { getKunkPublicConfig } from '@kunk/config';
import { useErrorModal } from '../../components/errors/ErrorModalProvider.jsx';
import NewServiceModal from './services/NewServiceModal.jsx';
import ServiceInfoModal from './services/ServiceInfoModal.jsx';
import PaymentModal from '../../components/PaymentModal.jsx';
import {
  daysAgoIso,
  formatDateTime,
  formatMoney,
  formatTags,
  STATUS_AWAITING,
  STATUS_PAID,
  normalizeServiceStatus,
  uuidToColor,
} from './services/servicesUtils.js';

const muiTheme = createTheme();
const GREEN = '#5a7a5b';
const PURPLE = '#7a5b7a';

function eventOpenUrl(row) {
  if (!hasRealCalendarEvent(row)) return null;
  if (row?.event_link) return row.event_link;
  if (row?.event_id) {
    return `https://calendar.google.com/calendar/u/0/r/eventedit/${encodeURIComponent(row.event_id)}`;
  }
  return null;
}

/** Seed/demo IDs não contam como evento Google real. */
function hasRealCalendarEvent(row) {
  const id = row?.event_id != null ? String(row.event_id).trim() : '';
  if (!id) return false;
  if (/^evt-demo/i.test(id)) return false;
  const link = row?.event_link != null ? String(row.event_link) : '';
  if (link.includes('meet.demo.kunk.local')) return false;
  return true;
}

export default function ServicesPage() {
  const bootstrap = getKunkPublicConfig();
  const api = useMemo(() => createApiClient({ baseUrl: bootstrap.apiUrl }), [bootstrap.apiUrl]);
  const { showError } = useErrorModal();
  const [searchParams] = useSearchParams();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get('s') || '');
  const [dateFrom, setDateFrom] = useState(daysAgoIso(14));
  const [dateTo, setDateTo] = useState('');
  const [showOnlyPaid, setShowOnlyPaid] = useState(null);
  const [newOpen, setNewOpen] = useState(Boolean(searchParams.get('u')));
  const [infoService, setInfoService] = useState(null);
  const [editDate, setEditDate] = useState(null);
  const [confirmReplace, setConfirmReplace] = useState(null);
  const [highlightIso, setHighlightIso] = useState(() => searchParams.get('h') || '');
  const [eventMenu, setEventMenu] = useState(null); // { anchorEl, row }
  const [pagarmeForServices, setPagarmeForServices] = useState(false);
  const [paymentService, setPaymentService] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getPagarmeStatus();
        if (!cancelled) {
          setPagarmeForServices(Boolean(res.data?.enabled && res.data?.use_for_services));
        }
      } catch {
        if (!cancelled) setPagarmeForServices(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '200');
      if (dateFrom) params.set('filter[date_created][_gte]', `${dateFrom}T00:00:00`);
      if (dateTo) params.set('filter[date_created][_lte]', `${dateTo}T23:59:59`);
      // Status filtrado no client (aceita legado pending/completed do seed)
      const res = await api.listServices(params.toString());
      let data = res.data || [];
      if (showOnlyPaid === true) {
        data = data.filter((s) => normalizeServiceStatus(s.status) === STATUS_PAID);
      } else if (showOnlyPaid === false) {
        data = data.filter((s) => normalizeServiceStatus(s.status) === STATUS_AWAITING);
      }
      if (q.trim()) {
        const words = q
          .normalize('NFD')
          .replace(/\p{M}/gu, '')
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean);
        data = data.filter((s) => {
          const hay = `${s.associate_name || ''} ${s.professional_name || ''} ${s.consultation_date || ''}`
            .normalize('NFD')
            .replace(/\p{M}/gu, '')
            .toLowerCase();
          return words.every((w) => hay.includes(w));
        });
      }
      setRows(data);
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  }, [api, dateFrom, dateTo, showOnlyPaid, q, showError]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleStatus(row) {
    const current = normalizeServiceStatus(row.status);
    const next = current === STATUS_PAID ? STATUS_AWAITING : STATUS_PAID;
    try {
      await api.updateService(row.id, { status: next });
      load();
    } catch (err) {
      showError(err);
    }
  }

  async function onSchedule(row) {
    try {
      const res = await api.scheduleService(row.id);
      const updated = res?.data || {};
      await load();
      const link = updated.event_link || eventOpenUrl(updated);
      if (link) {
        window.open(link, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      showError(err);
    }
  }

  function openEventMenu(event, row) {
    setEventMenu({ anchorEl: event.currentTarget, row });
  }

  function closeEventMenu() {
    setEventMenu(null);
  }

  function openExistingEvent() {
    const row = eventMenu?.row;
    closeEventMenu();
    const link = eventOpenUrl(row);
    if (link) window.open(link, '_blank', 'noopener,noreferrer');
  }

  async function cancelExistingEvent() {
    const row = eventMenu?.row;
    closeEventMenu();
    if (!row?.id) return;
    if (
      !window.confirm(
        'Cancelar o evento no Google Calendar?\n\nO serviço permanece; apenas o agendamento na agenda é removido.'
      )
    ) {
      return;
    }
    try {
      await api.unscheduleService(row.id);
      await load();
    } catch (err) {
      showError(err);
    }
  }

  async function onDelete(row) {
    if (!window.confirm('Excluir este serviço?')) return;
    try {
      await api.deleteService(row.id);
      load();
    } catch (err) {
      showError(err);
    }
  }

  async function applyDateChange(row, newDate, replace) {
    try {
      await api.updateService(row.id, {
        consultation_date: newDate || null,
        replace_calendar_event: replace,
      });
      setEditDate(null);
      setConfirmReplace(null);
      load();
    } catch (err) {
      if (err.code === 'EVENT_DATE_CONFIRMATION_REQUIRED') {
        setConfirmReplace({ row, newDate });
        return;
      }
      showError(err);
    }
  }

  return (
    <ThemeProvider theme={muiTheme}>
      <Box sx={{ p: 2 }}>
        <Box
          className="pageContainerOptions"
          sx={{
            bgcolor: '#f5f5f5',
            borderRadius: '30px',
            px: 3,
            py: 3,
            mb: 2,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
            alignItems: 'center',
          }}
        >
          <TextField
            size="small"
            label="Pesquisar"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <TextField
            size="small"
            type="date"
            label="Data inicial"
            InputLabelProps={{ shrink: true }}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <TextField
            size="small"
            type="date"
            label="Data final"
            InputLabelProps={{ shrink: true }}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <Tooltip title="Somente pagos">
            <IconButton
              color={showOnlyPaid === true ? 'success' : 'default'}
              onClick={() => setShowOnlyPaid((v) => (v === true ? null : true))}
            >
              <CheckCircleIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Somente pendentes">
            <IconButton
              color={showOnlyPaid === false ? 'primary' : 'default'}
              onClick={() => setShowOnlyPaid((v) => (v === false ? null : false))}
            >
              <AccessTimeIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={load}
            sx={{ bgcolor: PURPLE, '&:hover': { bgcolor: '#4d2d4d' } }}
          >
            Atualizar
          </Button>
          <Button
            variant="contained"
            onClick={() => setNewOpen(true)}
            sx={{ bgcolor: GREEN, '&:hover': { bgcolor: '#303B30' } }}
          >
            Novo Serviço
          </Button>
        </Box>

        <TableContainer component={Paper} className="pageContainerTable" elevation={0}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: GREEN }}>
                {[
                  'Criação',
                  '',
                  'Tags',
                  'Data da consulta',
                  'Associado',
                  'Profissional',
                  'Pago',
                  'Doação',
                  'Consulta',
                  'Status',
                  'Ações',
                ].map((h) => (
                  <TableCell key={h} sx={{ color: '#fff', fontWeight: 600 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11}>Carregando…</TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11}>Nenhum serviço</TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const rowIso = row.consultation_date || row.date_created;
                  let highlighted = false;
                  if (highlightIso && rowIso) {
                    try {
                      highlighted =
                        Math.abs(new Date(rowIso).getTime() - new Date(highlightIso).getTime()) <
                        60_000;
                    } catch {
                      highlighted = false;
                    }
                  }
                  return (
                  <TableRow
                    key={row.id}
                    hover
                    data-highlight={highlighted ? '1' : undefined}
                    sx={highlighted ? { bgcolor: 'rgba(122, 91, 122, 0.18)' } : undefined}
                  >
                    <TableCell>{formatDateTime(row.date_created)}</TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          bgcolor: uuidToColor(row.booking_group_code),
                        }}
                        title={row.booking_group_code || ''}
                      />
                    </TableCell>
                    <TableCell>
                      {formatTags(row.tags)}
                    </TableCell>
                    <TableCell
                      sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() =>
                        setEditDate({
                          row,
                          value: row.consultation_date
                            ? new Date(row.consultation_date).toISOString().slice(0, 16)
                            : '',
                        })
                      }
                    >
                      {formatDateTime(row.consultation_date)}
                    </TableCell>
                    <TableCell>{row.associate_name}</TableCell>
                    <TableCell>{row.professional_name}</TableCell>
                    <TableCell>{formatMoney(row.price_paid)}</TableCell>
                    <TableCell>{formatMoney(row.donation)}</TableCell>
                    <TableCell>{formatMoney(row.price)}</TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => toggleStatus(row)}>
                        {normalizeServiceStatus(row.status) === STATUS_PAID ? (
                          <CheckCircleIcon color="success" />
                        ) : (
                          <AccessTimeIcon color="primary" />
                        )}
                      </IconButton>
                      {pagarmeForServices &&
                        normalizeServiceStatus(row.status) === STATUS_AWAITING &&
                        Number(row.price_paid || row.price || 0) > 0 && (
                          <Tooltip title="Pagamento Pagar.me">
                            <IconButton
                              size="small"
                              data-testid={`service-pay-${row.id}`}
                              onClick={() => setPaymentService(row)}
                            >
                              <PaymentIcon fontSize="small" color="primary" />
                            </IconButton>
                          </Tooltip>
                        )}
                      <Typography variant="caption" display="block">
                        {normalizeServiceStatus(row.status) || STATUS_AWAITING}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip
                        title={
                          hasRealCalendarEvent(row)
                            ? 'Evento agendado — abrir ou cancelar'
                            : 'Agendar no Google Calendar'
                        }
                      >
                        <IconButton
                          size="small"
                          data-testid={
                            hasRealCalendarEvent(row)
                              ? 'service-event-open'
                              : 'service-event-schedule'
                          }
                          onClick={(e) => {
                            if (hasRealCalendarEvent(row)) openEventMenu(e, row);
                            else onSchedule(row);
                          }}
                          sx={{
                            color: hasRealCalendarEvent(row) ? GREEN : undefined,
                            '&:hover': hasRealCalendarEvent(row)
                              ? { color: '#303B30', bgcolor: 'rgba(90,122,91,0.12)' }
                              : undefined,
                          }}
                        >
                          <EventIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Info">
                        <IconButton size="small" color="primary" onClick={() => setInfoService(row)}>
                          <InfoIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton size="small" onClick={() => onDelete(row)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <NewServiceModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        api={api}
        initialUserCode={searchParams.get('u')}
        onCreated={load}
      />
      <ServiceInfoModal
        open={Boolean(infoService)}
        service={infoService}
        api={api}
        onClose={() => setInfoService(null)}
        onSaved={load}
      />

      <Menu
        anchorEl={eventMenu?.anchorEl || null}
        open={Boolean(eventMenu?.anchorEl)}
        onClose={closeEventMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <MenuItem onClick={openExistingEvent} data-testid="service-event-open-link">
          <ListItemIcon>
            <OpenInNewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Abrir no Google Calendar</ListItemText>
        </MenuItem>
        <MenuItem onClick={cancelExistingEvent} data-testid="service-event-cancel">
          <ListItemIcon>
            <EventBusyIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText primaryTypographyProps={{ color: 'error' }}>
            Cancelar evento
          </ListItemText>
        </MenuItem>
      </Menu>

      <Dialog open={Boolean(editDate)} onClose={() => setEditDate(null)}>
        <DialogTitle>Editar data</DialogTitle>
        <DialogContent>
          <TextField
            type="datetime-local"
            fullWidth
            margin="dense"
            InputLabelProps={{ shrink: true }}
            value={editDate?.value || ''}
            onChange={(e) => setEditDate((d) => ({ ...d, value: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDate(null)}>Cancelar</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: GREEN }}
            onClick={() =>
              applyDateChange(editDate.row, editDate.value || null, false)
            }
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmReplace)} onClose={() => setConfirmReplace(null)}>
        <DialogTitle>Alterar data do evento</DialogTitle>
        <DialogContent>
          Este serviço já possui um evento no calendário. Excluir o evento antigo e criar um novo
          com a nova data?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmReplace(null)}>Cancelar</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: GREEN }}
            onClick={() =>
              applyDateChange(confirmReplace.row, confirmReplace.newDate, true)
            }
          >
            Aprovar
          </Button>
        </DialogActions>
      </Dialog>

      <PaymentModal
        open={Boolean(paymentService)}
        onClose={() => setPaymentService(null)}
        api={api}
        context="service"
        entity={paymentService}
        onSuccess={() => load()}
      />
    </ThemeProvider>
  );
}
