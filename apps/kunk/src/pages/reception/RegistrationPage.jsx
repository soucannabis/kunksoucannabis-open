import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createApiClient } from '@kunk/api-client';
import { getKunkPublicConfig } from '@kunk/config';
import { useErrorModal } from '../../components/errors/ErrorModalProvider.jsx';
import { PATHS } from '../../app/menuConfig.js';
import AssociatesFilters, { PAGE_SIZE_OPTIONS } from './associates/AssociatesFilters.jsx';
import AssociatesTable from './associates/AssociatesTable.jsx';
import CreateAssociateModal from './associates/CreateAssociateModal.jsx';
import AssociateModal from './associates/AssociateModal.jsx';
import {
  buildAssociatesListQuery,
  displayName,
} from './associates/associatesStatus.js';

const muiTheme = createTheme();
const GREEN = '#5a7a5b';
const GREEN_HOVER = '#4a684b';
const PURPLE = '#7a5b7a';
const DEFAULT_PAGE_SIZE = 30;

export default function RegistrationPage() {
  const bootstrap = getKunkPublicConfig();
  const api = useMemo(() => createApiClient({ baseUrl: bootstrap.apiUrl, app: 'kunk' }), [bootstrap.apiUrl]);
  const { showError } = useErrorModal();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [patientNames, setPatientNames] = useState({});

  const deepA = searchParams.get('a');
  const totalPages = Math.max(1, Math.ceil((Number(totalCount) || 0) / pageSize) || 1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (deepA) {
        const res = await api.getUserByCode(deepA, 'patients=1');
        const u = res.data;
        setRows(u ? [u] : []);
        setTotalCount(u ? 1 : 0);
        setSelected(u || null);
        if (u?.patients?.length) {
          setPatientNames({
            [u.user_code]: u.patients.map((p) => displayName(p)).filter(Boolean).join(', '),
          });
        } else if (u?.patient_user_code) {
          try {
            const p = await api.getUserByCode(u.patient_user_code);
            if (p.data) {
              setPatientNames({ [u.user_code]: displayName(p.data) });
            }
          } catch {
            /* ignore */
          }
        } else {
          setPatientNames({});
        }
        return;
      }

      const qs = buildAssociatesListQuery({
        page,
        pageSize,
        search,
        statusFilter: filter,
      });
      const res = await api.listUsers(qs);
      const data = (res.data || []).filter((u) => String(u.status) !== 'patient');
      setRows(data);
      const metaCount = res.meta?.filter_count;
      setTotalCount(typeof metaCount === 'number' ? metaCount : data.length);

      const names = {};
      for (const u of data) {
        const fromHydrate = (u.patients || [])
          .map((p) => displayName(p))
          .filter(Boolean);
        if (fromHydrate.length) {
          names[u.user_code] = fromHydrate.join(', ');
          continue;
        }
        if (u.patient_user_code) {
          try {
            const p = await api.getUserByCode(u.patient_user_code);
            if (p.data) names[u.user_code] = displayName(p.data);
          } catch {
            /* ignore */
          }
        }
      }
      setPatientNames(names);
    } catch (err) {
      showError(err.message || 'Falha ao carregar associados');
      setRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [api, deepA, page, pageSize, search, filter, showError]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function handlePageSizeChange(nextSize) {
    setPageSize(nextSize);
    setPage(1);
  }

  function handleSearchSubmit() {
    const next = String(searchInput || '').trim();
    setPage(1);
    setSearch(next);
  }

  function handleFilterChange(nextFilter) {
    const nextSearch = String(searchInput || '').trim();
    setPage(1);
    setSearch(nextSearch);
    setFilter(nextFilter);
  }

  async function sendTriage(u) {
    try {
      const name = u.associate_name || displayName(u).split(' ')[0] || 'Associado';
      const last = u.associate_last_name || '';
      const created = await api.createReception({
        name,
        last_name: last,
        email: u.email_account || null,
        phone: u.mobile_number || null,
        is_associate: true,
        associate_code: u.user_code,
        associate_name: displayName(u),
      });
      const code = created?.data?.code;
      navigate(code ? `${PATHS.triage}?t=${encodeURIComponent(code)}` : PATHS.triage);
    } catch (err) {
      showError(err.message || 'Falha ao enviar para triagem');
    }
  }

  function openUser(u) {
    setSelected(u);
    if (u?.user_code) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('a', u.user_code);
        return next;
      });
    }
  }

  function closeModal() {
    setSelected(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('a');
      return next;
    });
  }

  const showPager = !deepA && !loading;

  return (
    <ThemeProvider theme={muiTheme}>
      <Box>
        <AssociatesFilters
          filter={filter}
          onFilterChange={handleFilterChange}
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          onSearch={handleSearchSubmit}
          onReload={() => load()}
          onCreate={() => setCreateOpen(true)}
          page={page}
          pageSize={pageSize}
          totalCount={deepA ? rows.length : totalCount}
        />

        {loading ? (
          <Box sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CircularProgress size={28} sx={{ color: GREEN }} />
          </Box>
        ) : (
          <>
            <AssociatesTable
              rows={rows}
              onOpen={openUser}
              onSendTriage={sendTriage}
              patientNames={patientNames}
            />
            {showPager ? (
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
            ) : null}
          </>
        )}

        <CreateAssociateModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          api={api}
          onCreated={async (data) => {
            if (data?.__existing && data.user_code) {
              try {
                const res = await api.getUserByCode(data.user_code);
                openUser(res.data);
              } catch (err) {
                showError(err.message || 'Conta já existe');
              }
              return;
            }
            if (page === 1) await load();
            else setPage(1);
            if (data) openUser(data);
          }}
        />

        <AssociateModal
          open={Boolean(selected)}
          user={selected}
          api={api}
          onClose={closeModal}
          onChanged={() => load()}
        />
      </Box>
    </ThemeProvider>
  );
}
