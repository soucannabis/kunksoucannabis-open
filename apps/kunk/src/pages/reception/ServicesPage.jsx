import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Select,
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
import SearchIcon from '@mui/icons-material/Search';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useSearchParams } from 'react-router-dom';
import { createApiClient } from '@kunk/api-client';
import { getKunkPublicConfig } from '@kunk/config';
import { useErrorModal } from '../../components/errors/ErrorModalProvider.jsx';
import { invalidateServicesCache } from '../../lib/cache/fetchers.js';
import NewServiceModal from './services/NewServiceModal.jsx';
import ServiceInfoModal from './services/ServiceInfoModal.jsx';
import PaymentModal from '../../components/PaymentModal.jsx';
import { contentAreaDialogProps } from '../../layout/contentAreaOverlay.js';
import {
  buildServicesListQuery,
  DEFAULT_PAGE_SIZE,
  formatDateTime,
  formatMoney,
  formatTags,
  PAGE_SIZE_OPTIONS,
  STATUS_AWAITING,
  STATUS_PAID,
  normalizeServiceStatus,
} from './services/servicesUtils.js';

const muiTheme = createTheme();
const GREEN = '#5a7a5b';
const GREEN_HOVER = '#4a684b';
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
  const api = useMemo(() => createApiClient({ baseUrl: bootstrap.apiUrl, app: 'kunk' }), [bootstrap.apiUrl]);
  const { showError } = useErrorModal();
  const [searchParams] = useSearchParams();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const [searchInput, setSearchInput] = useState(searchParams.get('s') || '');
  const [search, setSearch] = useState(searchParams.get('s') || '');
  const [dateFrom, setDateFrom] = useState('');
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
  const [googleCalendarEnabled, setGoogleCalendarEnabled] = useState(false);

  const totalPages = Math.max(1, Math.ceil((Number(totalCount) || 0) / pageSize) || 1);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getGoogleCalendarStatus();
        if (!cancelled) setGoogleCalendarEnabled(Boolean(res.data?.enabled));
      } catch {
        if (!cancelled) setGoogleCalendarEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = buildServicesListQuery({
        page,
        pageSize,
        search,
        dateFrom,
        dateTo,
        showOnlyPaid,
      });
      const res = await api.listServices(qs);
      const data = res.data || [];
      setRows(data);
      const metaCount = res.meta?.filter_count;
      setTotalCount(typeof metaCount === 'number' ? metaCount : data.length);
    } catch (err) {
      showError(err);
      setRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [api, page, pageSize, search, dateFrom, dateTo, showOnlyPaid, showError]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function handleSearchSubmit(e) {
    e?.preventDefault?.();
    setPage(1);
    setSearch(String(searchInput || '').trim());
  }

  function handlePageSizeChange(nextSize) {
    setPageSize(nextSize);
    setPage(1);
  }

  function handleDateFromChange(value) {
    setPage(1);
    setDateFrom(value);
  }

  function handleDateToChange(value) {
    setPage(1);
    setDateTo(value);
  }

  function handlePaidFilterToggle(target) {
    setPage(1);
    setShowOnlyPaid((v) => (v === target ? null : target));
  }

  async function toggleStatus(row) {
    const current = normalizeServiceStatus(row.status);
    const next = current === STATUS_PAID ? STATUS_AWAITING : STATUS_PAID;
    try {
      await api.updateService(row.id, { status: next });
      invalidateServicesCache();
      load();
    } catch (err) {
      showError(err);
    }
  }

  async function onSchedule(row) {
    try {
      const res = await api.scheduleService(row.id);
      const updated = res?.data || {};
      invalidateServicesCache();
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
      invalidateServicesCache();
      await load();
    } catch (err) {
      showError(err);
    }
  }

  async function onDelete(row) {
    if (!window.confirm('Excluir este serviço?')) return;
    try {
      await api.deleteService(row.id);
      invalidateServicesCache();
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
      invalidateServicesCache();
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
          <Box
            component="form"
            onSubmit={handleSearchSubmit}
            sx={{ minWidth: { xs: 160, sm: 260 }, flex: '1 1 220px', maxWidth: 360 }}
          >
            <TextField
              size="small"
              fullWidth
              label="Pesquisar"
              placeholder="Associado ou profissional"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton type="submit" edge="end" size="small" aria-label="Pesquisar" sx={{ color: PURPLE }}>
                      <SearchIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          <TextField
            size="small"
            type="date"
            label="Data inicial"
            InputLabelProps={{ shrink: true }}
            value={dateFrom}
            onChange={(e) => handleDateFromChange(e.target.value)}
          />
          <TextField
            size="small"
            type="date"
            label="Data final"
            InputLabelProps={{ shrink: true }}
            value={dateTo}
            onChange={(e) => handleDateToChange(e.target.value)}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 'auto' }}>
            <Tooltip title="Somente pagos">
              <IconButton
                color={showOnlyPaid === true ? 'success' : 'default'}
                onClick={() => handlePaidFilterToggle(true)}
              >
                <CheckCircleIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Somente pendentes">
              <IconButton
                color={showOnlyPaid === false ? 'primary' : 'default'}
                onClick={() => handlePaidFilterToggle(false)}
              >
                <AccessTimeIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={() => load()}
              sx={{ bgcolor: PURPLE, '&:hover': { bgcolor: '#4d2d4d' } }}
            >
              Atualizar
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CircularProgress size={28} sx={{ color: GREEN }} />
          </Box>
        ) : (
          <>
        <TableContainer component={Paper} className="pageContainerTable" elevation={0}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: GREEN }}>
                {[
                  'Criação',
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
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10}>Nenhum serviço</TableCell>
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
                      {googleCalendarEnabled ? (
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
                      ) : null}
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
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                flexWrap: 'wrap',
                mx: 'auto',
                mt: 2,
                mb: 3,
                px: 2,
                py: 1.25,
                maxWidth: 640,
                backgroundColor: PURPLE,
                borderRadius: '30px',
                boxShadow: '0 4px 14px rgba(74, 45, 74, 0.35)',
                color: '#fff',
              }}
            >
              <FormControl size="small" variant="standard" sx={{ minWidth: 110 }}>
                <Select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  disableUnderline
                  sx={{
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    '& .MuiSelect-icon': { color: '#fff' },
                    '& .MuiSelect-select': { py: 0.5, pr: 3 },
                  }}
                  MenuProps={{
                    PaperProps: { sx: { maxHeight: 280 } },
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <MenuItem key={n} value={n}>
                      {n} / página
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                size="small"
                startIcon={<ChevronLeftIcon />}
                disabled={page <= 1}
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                sx={{
                  color: '#fff',
                  bgcolor: GREEN,
                  '&:hover': { bgcolor: GREEN_HOVER },
                  '&.Mui-disabled': { color: 'rgba(255,255,255,0.4)', bgcolor: 'rgba(0,0,0,0.15)' },
                }}
              >
                Anterior
              </Button>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Página {page} de {totalPages}
                {totalCount ? ` · ${totalCount}` : ''}
              </Typography>
              <Button
                size="small"
                endIcon={<ChevronRightIcon />}
                disabled={page >= totalPages || totalCount === 0}
                onClick={() => {
                  setPage((p) => p + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                sx={{
                  color: '#fff',
                  bgcolor: GREEN,
                  '&:hover': { bgcolor: GREEN_HOVER },
                  '&.Mui-disabled': { color: 'rgba(255,255,255,0.4)', bgcolor: 'rgba(0,0,0,0.15)' },
                }}
              >
                Próxima
              </Button>
            </Box>
          </>
        )}
      </Box>

      <NewServiceModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        api={api}
        initialUserCode={searchParams.get('u')}
        onCreated={() => {
          invalidateServicesCache();
          load();
        }}
      />
      <ServiceInfoModal
        open={Boolean(infoService)}
        service={infoService}
        api={api}
        onClose={() => setInfoService(null)}
        onSaved={() => {
          invalidateServicesCache();
          load();
        }}
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

      <Dialog open={Boolean(editDate)} onClose={() => setEditDate(null)} {...contentAreaDialogProps}>
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

      <Dialog open={Boolean(confirmReplace)} onClose={() => setConfirmReplace(null)} {...contentAreaDialogProps}>
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
