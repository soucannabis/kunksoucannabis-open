import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Modal,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CachedIcon from '@mui/icons-material/Cached';
import AccessTimeFilledIcon from '@mui/icons-material/AccessTimeFilled';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ScheduleIcon from '@mui/icons-material/Schedule';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PendingIcon from '@mui/icons-material/Pending';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningIcon from '@mui/icons-material/Warning';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import FlagIcon from '@mui/icons-material/Flag';
import StarIcon from '@mui/icons-material/Star';
import ChatIcon from '@mui/icons-material/Chat';
import MailIcon from '@mui/icons-material/Mail';
import PhoneIcon from '@mui/icons-material/Phone';
import InboxIcon from '@mui/icons-material/Inbox';
import SyncIcon from '@mui/icons-material/Sync';
import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCartCheckout';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BoyIcon from '@mui/icons-material/Boy';
import PersonIcon from '@mui/icons-material/Person';
import NextPlanIcon from '@mui/icons-material/NextPlan';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import GroupIcon from '@mui/icons-material/Group';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import AvatarGroup from '@mui/material/AvatarGroup';
import { useOperatorAuth } from '@kunk/auth-session';
import { createApiClient } from '@kunk/api-client';
import {
  getEntryStatusValue,
  getKunkPublicConfig,
  getTriageDefaults,
  normalizeTriageStatuses,
} from '@kunk/config';
import { PATHS } from '../../app/menuConfig.js';

function calculateTime(dateString) {
  if (!dateString) return '—';
  const minutos = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
  if (Number.isNaN(minutos) || minutos < 0) return '—';
  if (minutos >= 1440) {
    const dias = Math.floor(minutos / 1440);
    return `Há ${dias}d`;
  }
  if (minutos >= 60) {
    const horas = Math.floor(minutos / 60);
    return `Há ${horas}h`;
  }
  return `Há ${minutos}m`;
}

function formatDateTo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) return '';
  let digits = phoneNumber.toString().replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phoneNumber;
}

function contactName(row) {
  return (
    row.full_name
    || [row.name, row.last_name].filter(Boolean).join(' ').trim()
    || row.associate_name
    || 'Sem nome'
  );
}

const STATUS_ICON_MAP = {
  AccessTimeFilled: AccessTimeFilledIcon,
  AccessTime: AccessTimeIcon,
  Schedule: ScheduleIcon,
  HourglassEmpty: HourglassEmptyIcon,
  Pending: PendingIcon,
  PlayCircle: PlayCircleIcon,
  PauseCircle: PauseCircleIcon,
  CheckCircle: CheckCircleIcon,
  TaskAlt: TaskAltIcon,
  DoneAll: DoneAllIcon,
  Cancel: CancelIcon,
  Warning: WarningIcon,
  PriorityHigh: PriorityHighIcon,
  Flag: FlagIcon,
  Star: StarIcon,
  Person: PersonIcon,
  SupportAgent: SupportAgentIcon,
  Chat: ChatIcon,
  Mail: MailIcon,
  Phone: PhoneIcon,
  Inbox: InboxIcon,
  Sync: SyncIcon,
};

function statusIcon(status) {
  let Icon = STATUS_ICON_MAP[status?.icon];
  if (!Icon) {
    if (status?.is_default_entry) Icon = AccessTimeFilledIcon;
    else if (status?.is_terminal) Icon = CheckCircleIcon;
    else if (String(status?.label || '').toLowerCase().includes('conclu')) Icon = TaskAltIcon;
    else Icon = AccessTimeIcon;
  }
  const color = status?.color
    || (status?.is_default_entry ? '#7A5B7A' : undefined);
  return (
    <Icon
      sx={{
        mr: 1,
        fontSize: 18,
        ...(color ? { color } : { color: 'primary.main' }),
      }}
    />
  );
}

function customFieldEntries(row, triageConfig) {
  const values = row?.tags?.custom_fields || {};
  const defs = [...(triageConfig.formFields || []), ...(triageConfig.customFields || [])];
  return Object.entries(values).map(([id, value]) => {
    const def = defs.find((f) => f.id === id);
    return { id, label: def?.label || id, value };
  });
}

const paperSx = {
  backgroundColor: '#f5f5f5',
  borderRadius: '30px !important',
  boxShadow: 'none',
  width: 'calc(100% - 20px)',
  maxWidth: 'calc(100% - 20px)',
  marginLeft: '20px',
  boxSizing: 'border-box',
};

function attendantDisplayName(att) {
  if (!att) return 'Atendente';
  return [att.name, att.last_name].filter(Boolean).join(' ').trim() || att.email || att.code || 'Atendente';
}

function myAttendantCode(user) {
  if (!user) return null;
  return user.user_code || user.internal_code || (user.id != null ? String(user.id) : null);
}

/** Material theme — TriagePage uses @mui/material inside Joy CssVarsProvider. */
const materialTheme = createTheme({
  palette: {
    primary: { main: '#5a7a5b' },
    secondary: { main: '#7A5B7A' },
  },
});

export default function TriagePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkCode = searchParams.get('t');
  const { user: loggedUser } = useOperatorAuth();
  const myCode = useMemo(() => myAttendantCode(loggedUser), [loggedUser]);

  const api = useMemo(() => {
    const bootstrap = getKunkPublicConfig();
    return createApiClient({ baseUrl: bootstrap.apiUrl });
  }, []);

  const [triageConfig, setTriageConfig] = useState(getTriageDefaults());
  const [tab, setTab] = useState(0);
  const [counts, setCounts] = useState({});
  const [rows, setRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [attendantBusyId, setAttendantBusyId] = useState(null);

  const [attendants, setAttendants] = useState([]);
  const [selectedAttendantFilters, setSelectedAttendantFilters] = useState([]);

  const [avatarMenu, setAvatarMenu] = useState({ anchor: null, row: null });
  const [actionMenu, setActionMenu] = useState({ anchor: null, row: null });
  const [transferMenu, setTransferMenu] = useState({ anchor: null, row: null });

  const [linkRow, setLinkRow] = useState(null);
  const [linkQuery, setLinkQuery] = useState('');
  const [linkResults, setLinkResults] = useState([]);
  const [linkBusy, setLinkBusy] = useState(false);

  const [docsRow, setDocsRow] = useState(null);
  const [docsUser, setDocsUser] = useState(null);
  const [docsFiles, setDocsFiles] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const statuses = useMemo(
    () => (triageConfig.statuses || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0)),
    [triageConfig.statuses],
  );

  const activeStatus = statuses[tab]?.value || getEntryStatusValue(statuses);

  const attendantsByCode = useMemo(() => {
    const map = {};
    for (const a of attendants) {
      if (a.code) map[a.code] = a;
      if (a.user_code) map[a.user_code] = a;
      if (a.internal_code) map[a.internal_code] = a;
    }
    return map;
  }, [attendants]);

  const filteredRows = useMemo(() => {
    if (!selectedAttendantFilters.length) return rows;
    return rows.filter((r) => r.attendant && selectedAttendantFilters.includes(String(r.attendant)));
  }, [rows, selectedAttendantFilters]);

  const uniqueRowAttendants = useMemo(() => {
    const list = [];
    const seen = new Set();
    for (const row of rows) {
      if (!row.attendant || seen.has(String(row.attendant))) continue;
      seen.add(String(row.attendant));
      list.push(attendantsByCode[row.attendant] || { code: row.attendant, name: row.attendant });
    }
    return list;
  }, [rows, attendantsByCode]);

  const loadConfig = useCallback(async () => {
    try {
      const schema = await api.receptionFormSchema();
      const defaults = getTriageDefaults();
      const next = {
        formFields: schema.data?.form_fields || defaults.formFields,
        customFields: schema.data?.custom_fields || defaults.customFields,
        statuses: normalizeTriageStatuses(schema.data?.statuses || defaults.statuses),
        associateDocs: Boolean(schema.data?.associate_docs),
        publicFormEnabled: schema.data?.enabled !== false,
      };
      setTriageConfig(next);
      setTab((prev) => {
        const list = next.statuses || [];
        return prev < list.length ? prev : 0;
      });
    } catch {
      /* keep defaults */
    }
  }, [api]);

  const loadAttendants = useCallback(async () => {
    try {
      const res = await api.receptionAttendants();
      setAttendants(res.data || []);
    } catch {
      setAttendants([]);
    }
  }, [api]);

  const loadCounts = useCallback(async () => {
    const res = await api.receptionStatusCounts();
    setCounts(res.data || {});
  }, [api]);

  const loadRows = useCallback(async (status, q) => {
    const params = new URLSearchParams({
      sort: '-date_created',
      limit: '100',
      meta: 'filter_count',
    });
    if (deepLinkCode) {
      params.set('filter', JSON.stringify({ code: { _eq: deepLinkCode } }));
    } else {
      params.set('filter', JSON.stringify({ status: { _eq: status } }));
    }
    if (q && q.trim()) params.set('search', q.trim());
    const res = await api.listItems('reception', params.toString());
    setRows(res.data || []);
  }, [api, deepLinkCode]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadCounts(), loadRows(activeStatus, searchQuery), loadAttendants()]);
    } catch (err) {
      setError(err.message || 'Falha ao carregar triagem');
    } finally {
      setLoading(false);
    }
  }, [loadCounts, loadRows, loadAttendants, activeStatus, searchQuery]);

  useEffect(() => {
    loadConfig();
    loadAttendants();
  }, [loadConfig, loadAttendants]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function changeStatus(row, status) {
    setAvatarMenu({ anchor: null, row: null });
    setBusyId(row.id);
    setError('');
    try {
      await api.updateReceptionStatus(row.id, status);
      await refresh();
    } catch (err) {
      setError(err.message || 'Falha ao atualizar status');
    } finally {
      setBusyId(null);
    }
  }

  async function assumeContact(row) {
    if (!myCode) {
      setError('Não foi possível identificar o usuário logado');
      return;
    }
    setAttendantBusyId(row.id);
    setError('');
    try {
      await api.assignReceptionAttendant(row.id, myCode);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, attendant: myCode } : r)));
    } catch (err) {
      setError(err.message || 'Falha ao assumir contato');
    } finally {
      setAttendantBusyId(null);
    }
  }

  async function transferContact(row, attendantCode) {
    setTransferMenu({ anchor: null, row: null });
    if (!attendantCode) return;
    setAttendantBusyId(row.id);
    setError('');
    try {
      await api.assignReceptionAttendant(row.id, attendantCode);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, attendant: attendantCode } : r)));
    } catch (err) {
      setError(err.message || 'Falha ao transferir contato');
    } finally {
      setAttendantBusyId(null);
    }
  }

  async function clearAttendant(row) {
    setAttendantBusyId(row.id);
    setError('');
    try {
      await api.clearReceptionAttendant(row.id);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, attendant: null } : r)));
    } catch (err) {
      setError(err.message || 'Falha ao remover atendente');
    } finally {
      setAttendantBusyId(null);
    }
  }

  function toggleAttendantFilter(code) {
    setSelectedAttendantFilters((prev) => (
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    ));
  }

  async function goToOrderOrService(row, kind) {
    setActionMenu({ anchor: null, row: null });
    if (!row.associate_code) return;
    setBusyId(row.id);
    setError('');
    try {
      await api.completeReception(row.id, kind === 'order' ? 'Pedido' : 'Serviço');
      // Legado: Pedido → /app/loja/novo-pedido?u= ; Serviço → /app/acolhimento/servicos?u=
      const path = kind === 'order' ? PATHS.newOrder : PATHS.services;
      navigate(`${path}?u=${encodeURIComponent(row.associate_code)}`);
    } catch (err) {
      setError(err.message || 'Falha ao concluir contato');
      setBusyId(null);
    }
  }

  async function unlink(row) {
    setBusyId(row.id);
    try {
      await api.unlinkReceptionAssociate(row.id);
      await refresh();
    } catch (err) {
      setError(err.message || 'Falha ao desvincular');
    } finally {
      setBusyId(null);
    }
  }

  async function searchAssociates(q) {
    setLinkQuery(q);
    if (!q || q.trim().length < 2) {
      setLinkResults([]);
      return;
    }
    try {
      const res = await api.searchUsers(q.trim());
      setLinkResults(res.data || []);
    } catch {
      setLinkResults([]);
    }
  }

  async function confirmLink(user) {
    if (!linkRow || !user?.user_code) return;
    setLinkBusy(true);
    try {
      await api.linkReceptionAssociate(linkRow.id, user.user_code);
      setLinkRow(null);
      setLinkQuery('');
      setLinkResults([]);
      await refresh();
    } catch (err) {
      setError(err.message || 'Falha ao vincular');
    } finally {
      setLinkBusy(false);
    }
  }

  async function openDocs(row) {
    if (!row.associate_code) return;
    setDocsRow(row);
    setDocsLoading(true);
    setDocsUser(null);
    setDocsFiles([]);
    try {
      const userRes = await api.get(`/users/by-code/${encodeURIComponent(row.associate_code)}`);
      setDocsUser(userRes.data || null);
      if (userRes.data?.id) {
        const linkRes = await api.listItems(
          'users_files',
          new URLSearchParams({
            filter: JSON.stringify({ user_id: { _eq: userRes.data.id } }),
            limit: '50',
          }).toString(),
        );
        const fileIds = (linkRes.data || []).map((x) => x.file_id).filter(Boolean);
        const files = [];
        for (const fileId of fileIds.slice(0, 20)) {
          try {
            const f = await api.getFile(fileId);
            if (f.data) files.push(f.data);
          } catch {
            /* skip */
          }
        }
        setDocsFiles(files);
      }
    } catch (err) {
      setError(err.message || 'Falha ao carregar dados do associado');
    } finally {
      setDocsLoading(false);
    }
  }

  return (
    <ThemeProvider theme={materialTheme}>
    <Box sx={{ width: '100%', mb: 2, display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
      <Tabs
        orientation="vertical"
        value={tab}
        onChange={(_, v) => setTab(v)}
        TabIndicatorProps={{ style: { backgroundColor: '#7A5B7A', width: 4, right: 0, left: 'unset' } }}
        sx={{
          borderRight: 1,
          borderColor: 'divider',
          minWidth: 160,
          maxWidth: 220,
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          background: '#fff',
          zIndex: 2,
          borderRadius: '30px',
        }}
      >
        {statuses.map((s, idx) => (
          <Tab
            key={s.id || s.value}
            value={idx}
            label={(
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '100%' }}>
                {statusIcon(s)}
                <span style={{ textAlign: 'left', textTransform: 'none', fontWeight: 400, fontSize: 11 }}>
                  {s.label}
                </span>
                <Chip
                  label={counts[s.value] ?? 0}
                  size="small"
                  sx={{ ml: 1, height: 20, fontSize: 12, bgcolor: '#e0e0e0' }}
                />
              </Box>
            )}
            sx={{
              '&.Mui-selected': { color: '#7A5B7A' },
              textAlign: 'left',
              alignItems: 'flex-start',
              minHeight: 48,
              justifyContent: 'flex-start',
              pl: 1,
              pr: 1,
            }}
          />
        ))}
      </Tabs>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        {deepLinkCode ? (
          <Paper
            elevation={0}
            sx={{
              ...paperSx,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1.5,
              marginBottom: '12px',
              padding: '12px 20px',
              bgcolor: 'rgba(122, 91, 122, 0.12)',
            }}
          >
            <Typography variant="body2" sx={{ color: '#4d2d4d', fontWeight: 600 }}>
              Exibindo 1 contato (filtro por código)
            </Typography>
            <Button
              size="small"
              variant="contained"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete('t');
                setSearchParams(next, { replace: true });
              }}
              sx={{ bgcolor: '#7A5B7A', '&:hover': { bgcolor: '#4d2d4d' }, textTransform: 'none' }}
            >
              Ver todas
            </Button>
          </Paper>
        ) : null}
        <Paper
          elevation={0}
          sx={{
            ...paperSx,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
            marginBottom: '20px',
            padding: '24px 25px',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 260 }}>
            <TextField
              className="searchInput"
              label="Filtrar resultados"
              variant="filled"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') refresh();
              }}
              sx={{ minWidth: 300, flex: 1, maxWidth: 420 }}
              size="small"
            />
            <AvatarGroup max={10}>
              {uniqueRowAttendants.map((att) => {
                const code = String(att.code);
                const selected = selectedAttendantFilters.includes(code);
                return (
                  <Tooltip key={code} title={attendantDisplayName(att)}>
                    <Avatar
                      src={att.avatar_url || undefined}
                      alt={attendantDisplayName(att)}
                      onClick={() => toggleAttendantFilter(code)}
                      sx={{
                        width: 36,
                        height: 36,
                        cursor: 'pointer',
                        border: selected ? '2px solid #5a7a5b' : '2px solid transparent',
                        opacity: selectedAttendantFilters.length === 0 || selected ? 1 : 0.4,
                      }}
                    />
                  </Tooltip>
                );
              })}
            </AvatarGroup>
            {selectedAttendantFilters.length > 0 ? (
              <IconButton onClick={() => setSelectedAttendantFilters([])} size="small" aria-label="Limpar filtro de atendentes">
                <CloseIcon fontSize="small" />
              </IconButton>
            ) : null}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography
              variant="subtitle2"
              sx={{
                background: '#e0e0e0',
                color: '#5a7a5b',
                borderRadius: '12px',
                px: 2,
                py: 0.5,
                fontWeight: 'bold',
                fontSize: '15px',
              }}
            >
              {filteredRows.length} contato{filteredRows.length === 1 ? '' : 's'} na fila
            </Typography>
            <Button
              onClick={refresh}
              startIcon={loading ? <CircularProgress size={20} style={{ color: 'white' }} /> : <CachedIcon />}
              sx={{
                bgcolor: '#7A5B7A',
                color: 'white',
                '&:hover': { bgcolor: '#4d2d4d' },
                textTransform: 'none',
              }}
            >
              {loading ? 'Carregando...' : 'Atualizar'}
            </Button>
          </Box>
        </Paper>

        {error ? (
          <Typography sx={{ ml: '20px', mb: 1, color: '#b71c1c' }}>{error}</Typography>
        ) : null}

        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ ...paperSx, overflow: 'hidden' }}
        >
          <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#5a7a5b' }}>
                <TableCell sx={{ color: 'white', width: '40%', pl: '28px' }}>Contato</TableCell>
                <TableCell sx={{ color: 'white', width: '60%' }}>Mensagem</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell align="center" colSpan={2} sx={{ padding: '20px' }}>
                    <Box sx={{ width: '100%' }}>
                      <LinearProgress color="success" sx={{ height: 6, borderRadius: 3 }} />
                      <Typography variant="body2" sx={{ mt: 1, color: '#5a7a5b' }}>
                        Carregando dados...
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : null}

              {!loading && filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell align="center" colSpan={2} sx={{ padding: '28px', color: '#5a7a5b' }}>
                    Nenhum contato neste status.
                  </TableCell>
                </TableRow>
              ) : null}

              {filteredRows.map((row, index) => {
                const linked = Boolean(row.associate_code);
                const customs = customFieldEntries(row, triageConfig);
                const busy = busyId === row.id;
                const attendantBusy = attendantBusyId === row.id;
                const rowAttendant = row.attendant ? attendantsByCode[row.attendant] : null;
                const highlighted = deepLinkCode
                  && row.code
                  && String(row.code).trim() === String(deepLinkCode).trim();

                return (
                  <React.Fragment key={row.id}>
                    <TableRow
                      id={row.code ? `reception-row-code-${row.code}` : undefined}
                      sx={{
                        height: '180px',
                        backgroundColor: highlighted
                          ? 'rgba(122, 91, 122, 0.22) !important'
                          : index % 2 === 0
                            ? '#e8ede9ab'
                            : 'transparent',
                        outline: highlighted ? '2px solid #7A5B7A' : undefined,
                        '&:last-child td, &:last-child th': {
                          borderBottom: '10px solid #2e442f !important',
                        },
                      }}
                    >
                      <TableCell
                        sx={{
                          width: '40%',
                          paddingTop: '20px',
                          paddingBottom: '20px',
                          paddingLeft: '28px',
                          borderBottom: '10px solid #2e442f !important',
                          verticalAlign: 'top',
                        }}
                      >
                        <Box
                          onClick={(e) => setAvatarMenu({ anchor: e.currentTarget, row })}
                          sx={{
                            cursor: busy ? 'wait' : 'pointer',
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'baseline',
                            gap: 1,
                            mb: 1,
                            width: 'fit-content',
                            '&:hover': { color: '#7A5B7A' },
                          }}
                          title="Alterar status"
                        >
                          <Typography variant="body2" sx={{ fontWeight: 700, m: 0 }}>
                            {calculateTime(row.date_created)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#5a7a5b', m: 0 }}>
                            {formatDateTo(row.date_created)}
                          </Typography>
                        </Box>

                        <Typography
                          component="div"
                          sx={{ fontSize: 12, fontWeight: 400, color: '#666', mb: 0.35 }}
                        >
                          Nome
                        </Typography>
                        <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 1.5 }}>
                          {contactName(row)}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <MailIcon sx={{ fontSize: 16, color: '#5a7a5b', flexShrink: 0 }} />
                            <Typography sx={{ fontSize: 14, wordBreak: 'break-word' }}>
                              {row.email || '—'}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <PhoneIcon sx={{ fontSize: 16, color: '#5a7a5b', flexShrink: 0 }} />
                            <Typography sx={{ fontSize: 14 }}>
                              {formatPhoneNumber(row.phone) || '—'}
                            </Typography>
                          </Box>
                        </Box>
                        {linked ? (
                          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 1.25 }}>
                            <Chip
                              icon={<PersonIcon sx={{ color: 'white !important' }} />}
                              label={(
                                (() => {
                                  const name = String(row.associate_name || '').trim() || 'Associado';
                                  return name.length > 22 ? `${name.slice(0, 22)}...` : name;
                                })()
                              )}
                              onDelete={() => unlink(row)}
                              deleteIcon={<LinkOffIcon sx={{ color: 'white !important' }} />}
                              size="small"
                              sx={{
                                backgroundColor: '#1976d2',
                                color: 'white',
                                height: 'auto',
                                maxWidth: '100%',
                                '& .MuiChip-label': {
                                  fontSize: 12,
                                  fontWeight: 700,
                                  px: 1,
                                  py: 0.35,
                                  overflow: 'hidden',
                                },
                              }}
                            />
                          </Box>
                        ) : null}
                        {row.patient_name ? (
                          <Box sx={{ mt: 1.25 }}>
                            <Typography
                              component="div"
                              sx={{ fontSize: 12, fontWeight: 400, color: '#666', mb: 0.35 }}
                            >
                              Paciente
                            </Typography>
                            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
                              {row.patient_name}
                            </Typography>
                          </Box>
                        ) : null}
                      </TableCell>

                      <TableCell
                        sx={{
                          width: '60%',
                          paddingTop: '20px',
                          paddingBottom: '20px',
                          paddingRight: '72px',
                          borderBottom: '10px solid #2e442f !important',
                          verticalAlign: 'top',
                          position: 'relative',
                        }}
                      >
                        <Box sx={{ display: 'grid', gap: 1.25 }}>
                          {row.option1 ? (
                            <Box>
                              <Typography
                                component="div"
                                sx={{ fontSize: 12, fontWeight: 400, color: '#666', mb: 0.35 }}
                              >
                                Como posso ajudar
                              </Typography>
                              <Typography sx={{ fontSize: 16 }}>{row.option1}</Typography>
                            </Box>
                          ) : null}
                          <Box>
                            <Typography
                              component="div"
                              sx={{ fontSize: 12, fontWeight: 400, color: '#666', mb: 0.35 }}
                            >
                              Motivo
                            </Typography>
                            <Typography sx={{ fontSize: 16 }}>{row.message || '—'}</Typography>
                          </Box>
                        </Box>

                        {customs.length ? (
                          <Box sx={{ mt: 1.5, display: 'grid', gap: 0.25 }}>
                            <Typography variant="caption" sx={{ color: '#666', fontWeight: 700 }}>
                              Campos personalizados
                            </Typography>
                            {customs.map((c) => (
                              <Typography key={c.id} variant="caption">
                                <strong>{c.label}:</strong> {String(c.value)}
                              </Typography>
                            ))}
                          </Box>
                        ) : null}

                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            marginTop: '40px',
                            gap: 1,
                            flexWrap: 'wrap',
                            pr: 1,
                          }}
                        >
                          <Tooltip title="Assumir o contato">
                            <span>
                              <IconButton
                                onClick={() => assumeContact(row)}
                                disabled={attendantBusy || busy || !myCode}
                                aria-label="Assumir o contato"
                              >
                                {attendantBusy ? (
                                  <CircularProgress size={22} color="primary" />
                                ) : (
                                  <SupportAgentIcon color="primary" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Transferir contato">
                            <span>
                              <IconButton
                                onClick={(e) => setTransferMenu({ anchor: e.currentTarget, row })}
                                disabled={attendantBusy || busy}
                                aria-label="Transferir contato"
                              >
                                <GroupIcon color="primary" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          {row.attendant ? (
                            <Chip
                              avatar={(
                                <Avatar
                                  src={rowAttendant?.avatar_url || undefined}
                                  alt={attendantDisplayName(rowAttendant) || row.attendant}
                                />
                              )}
                              label={attendantDisplayName(rowAttendant) || row.attendant}
                              onDelete={attendantBusy ? undefined : () => clearAttendant(row)}
                              deleteIcon={<DeleteIcon />}
                              sx={{
                                backgroundColor: '#1976d2',
                                color: 'white',
                                fontSize: '12px',
                                '& .MuiChip-deleteIcon': {
                                  color: 'white',
                                  '&:hover': { color: 'rgba(255,255,255,0.8)' },
                                },
                              }}
                            />
                          ) : (
                            <Chip
                              label="Sem atendente"
                              size="small"
                              sx={{ bgcolor: '#f5f5f5', border: '1px solid #e0e0e0', fontSize: 12 }}
                            />
                          )}
                          {triageConfig.associateDocs && linked ? (
                            <Tooltip title="Documentos / dados">
                              <IconButton size="small" onClick={() => openDocs(row)} sx={{ color: '#7A5B7A' }}>
                                <DescriptionOutlinedIcon />
                              </IconButton>
                            </Tooltip>
                          ) : null}
                        </Box>

                        <Tooltip title="Pedido / Serviço / Linkar">
                          <IconButton
                            onClick={(e) => setActionMenu({ anchor: e.currentTarget, row })}
                            disabled={busy}
                            aria-label="Ações de pedido e serviço"
                            sx={{
                              position: 'absolute',
                              right: 12,
                              bottom: 16,
                              width: 44,
                              height: 44,
                              borderRadius: 0,
                              border: '2px solid #7A5B7A',
                              bgcolor: '#7A5B7A',
                              color: '#fff',
                              boxShadow: '0 2px 8px rgba(122,91,122,0.35)',
                              '&:hover': {
                                bgcolor: '#4d2d4d',
                                borderColor: '#4d2d4d',
                              },
                              '&.Mui-disabled': {
                                bgcolor: 'rgba(122,91,122,0.4)',
                                color: 'rgba(255,255,255,0.7)',
                              },
                            }}
                          >
                            <NextPlanIcon sx={{ fontSize: 26, color: '#fff' }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Menu
        anchorEl={avatarMenu.anchor}
        open={Boolean(avatarMenu.anchor)}
        onClose={() => setAvatarMenu({ anchor: null, row: null })}
      >
        {statuses.map((s) => (
          <MenuItem
            key={s.value}
            selected={avatarMenu.row?.status === s.value}
            onClick={() => avatarMenu.row && changeStatus(avatarMenu.row, s.value)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: avatarMenu.row?.status === s.value ? '#7A5B7A' : 'inherit',
              fontWeight: avatarMenu.row?.status === s.value ? 'bold' : 'normal',
            }}
          >
            {statusIcon(s)}
            <span style={{ fontSize: 13 }}>{s.label}</span>
          </MenuItem>
        ))}
      </Menu>

      <Menu
        anchorEl={transferMenu.anchor}
        open={Boolean(transferMenu.anchor)}
        onClose={() => setTransferMenu({ anchor: null, row: null })}
      >
        {attendants.length === 0 ? (
          <MenuItem disabled>Nenhum atendente disponível</MenuItem>
        ) : (
          attendants.map((att) => (
            <MenuItem
              key={att.code}
              selected={transferMenu.row?.attendant === att.code}
              disabled={transferMenu.row?.attendant === att.code}
              onClick={() => transferContact(transferMenu.row, att.code)}
            >
              <Avatar src={att.avatar_url || undefined} sx={{ width: 32, height: 32, mr: 1 }} />
              {attendantDisplayName(att)}
            </MenuItem>
          ))
        )}
      </Menu>

      <Menu
        anchorEl={actionMenu.anchor}
        open={Boolean(actionMenu.anchor)}
        onClose={() => setActionMenu({ anchor: null, row: null })}
      >
        {actionMenu.row?.associate_code ? (
          [
            <MenuItem
              key="service"
              onClick={() => goToOrderOrService(actionMenu.row, 'service')}
              sx={{ display: 'flex', gap: 1, alignItems: 'center' }}
            >
              <CalendarMonthIcon fontSize="small" />
              Serviço
            </MenuItem>,
            <MenuItem
              key="order"
              onClick={() => goToOrderOrService(actionMenu.row, 'order')}
              sx={{ display: 'flex', gap: 1, alignItems: 'center' }}
            >
              <ShoppingCartCheckoutIcon fontSize="small" />
              Pedido
            </MenuItem>,
            <MenuItem
              key="unlink"
              onClick={() => {
                const row = actionMenu.row;
                setActionMenu({ anchor: null, row: null });
                if (row) unlink(row);
              }}
              sx={{ display: 'flex', gap: 1, alignItems: 'center' }}
            >
              <LinkOffIcon fontSize="small" />
              Desvincular associado
            </MenuItem>,
          ]
        ) : (
          <MenuItem
            onClick={() => {
              setLinkRow(actionMenu.row);
              setActionMenu({ anchor: null, row: null });
            }}
            sx={{ display: 'flex', gap: 1, alignItems: 'center' }}
          >
            <BoyIcon fontSize="small" />
            Linkar a um Associado
          </MenuItem>
        )}
      </Menu>

      <Modal open={Boolean(linkRow)} onClose={() => setLinkRow(null)}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: '#fff',
            borderRadius: '16px',
            p: 3,
            width: 'min(520px, 92vw)',
            outline: 'none',
          }}
        >
          <Typography variant="h6" sx={{ mb: 1 }}>Linkar associado</Typography>
          <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
            {linkRow ? contactName(linkRow) : ''}
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="Buscar por nome, e-mail, CPF…"
            value={linkQuery}
            onChange={(e) => searchAssociates(e.target.value)}
            autoFocus
          />
          <Box sx={{ maxHeight: 280, overflow: 'auto', mt: 1.5, display: 'grid', gap: 0.5 }}>
            {linkResults.map((u) => {
              const name = [u.associate_name, u.associate_last_name].filter(Boolean).join(' ')
                || u.fullname
                || 'Sem nome';
              const email = u.email || u.email_account || '—';
              return (
                <Button
                  key={u.id}
                  variant="outlined"
                  disabled={linkBusy}
                  onClick={() => confirmLink(u)}
                  sx={{
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    py: 1,
                  }}
                >
                  <Typography component="span" sx={{ fontWeight: 600, fontSize: 14 }}>
                    {name}
                  </Typography>
                  <Typography component="span" sx={{ fontSize: 12, color: '#666' }}>
                    {email}
                  </Typography>
                </Button>
              );
            })}
            {linkQuery.length >= 2 && linkResults.length === 0 ? (
              <Typography variant="body2" sx={{ color: '#777' }}>Nenhum resultado</Typography>
            ) : null}
          </Box>
        </Box>
      </Modal>

      <Modal open={Boolean(docsRow)} onClose={() => setDocsRow(null)}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: '#fff',
            borderRadius: '16px',
            p: 3,
            width: 'min(560px, 92vw)',
            outline: 'none',
          }}
        >
          <Typography variant="h6">Dados do associado</Typography>
          {docsLoading ? <CircularProgress sx={{ my: 2 }} /> : null}
          {!docsLoading && docsUser ? (
            <Box sx={{ display: 'grid', gap: 0.5, mt: 1 }}>
              <Typography variant="body2">
                <strong>Nome:</strong>{' '}
                {[docsUser.associate_name, docsUser.associate_last_name].filter(Boolean).join(' ') || '—'}
              </Typography>
              <Typography variant="body2">
                <strong>E-mail:</strong> {docsUser.email || docsUser.email_account || '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Telefone:</strong> {docsUser.mobile_number || '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Código:</strong> {docsUser.user_code || '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Status:</strong> {docsUser.status || '—'}
              </Typography>
              <Typography variant="subtitle2" sx={{ mt: 1 }}>Arquivos</Typography>
              {docsFiles.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#777' }}>Nenhum arquivo</Typography>
              ) : (
                docsFiles.map((f) => (
                  <Typography key={f.id} variant="body2">
                    {f.filename || f.title || f.id}
                  </Typography>
                ))
              )}
            </Box>
          ) : null}
        </Box>
      </Modal>
    </Box>
    </ThemeProvider>
  );
}
