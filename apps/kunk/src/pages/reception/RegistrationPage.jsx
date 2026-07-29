import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createApiClient } from '@kunk/api-client';
import { getKunkPublicConfig } from '@kunk/config';
import { useErrorModal } from '../../components/errors/ErrorModalProvider.jsx';
import { PATHS } from '../../app/menuConfig.js';
import AssociatesFilters from './associates/AssociatesFilters.jsx';
import AssociatesTable from './associates/AssociatesTable.jsx';
import CreateAssociateModal from './associates/CreateAssociateModal.jsx';
import AssociateModal from './associates/AssociateModal.jsx';
import {
  displayName,
  matchesFilter,
  statusLabel,
} from './associates/associatesStatus.js';

const muiTheme = createTheme();
const GREEN = '#5a7a5b';

export default function RegistrationPage() {
  const bootstrap = getKunkPublicConfig();
  const api = useMemo(() => createApiClient({ baseUrl: bootstrap.apiUrl, app: 'kunk' }), [bootstrap.apiUrl]);
  const { showError } = useErrorModal();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [limit, setLimit] = useState(60);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState('');
  const [localQ, setLocalQ] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [patientNames, setPatientNames] = useState({});

  const load = useCallback(async ({ silent = false, nextLimit } = {}) => {
    if (silent) setLoadingMore(true);
    else setLoading(true);
    try {
      const deepA = searchParams.get('a');
      if (deepA) {
        const res = await api.getUserByCode(deepA, 'patients=1');
        const u = res.data;
        setRows(u ? [u] : []);
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
        }
        return;
      }

      const params = new URLSearchParams();
      params.set('limit', String(nextLimit ?? limit));
      params.set('sort', '-created_date');
      params.set('filter[status][_neq]', 'patient');
      params.set('patients', '1');
      const res = await api.listUsers(params.toString());
      const data = res.data || [];
      setRows(data);

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
      if (!silent) setRows([]);
    } finally {
      if (silent) setLoadingMore(false);
      else setLoading(false);
    }
  }, [api, limit, searchParams, showError]);

  useEffect(() => {
    load();
    // Recarrega só na montagem / deep-link; "carregar mais" chama load explicitamente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, searchParams, showError]);

  async function handleLoadMore() {
    const next = limit + 60;
    setLimit(next);
    await load({ silent: true, nextLimit: next });
  }

  const visible = useMemo(() => {
    let list = rows.filter((u) => String(u.status) !== 'patient');
    list = list.filter((u) => matchesFilter(u, filter));
    const q = localQ
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .trim();
    if (q) {
      list = list.filter((u) => {
        const blob = [
          displayName(u),
          u.email_account,
          u.mobile_number,
          statusLabel(u),
          patientNames[u.user_code],
        ]
          .filter(Boolean)
          .join(' ')
          .normalize('NFD')
          .replace(/\p{M}/gu, '')
          .toLowerCase();
        return blob.includes(q);
      });
    }
    return list;
  }, [rows, filter, localQ, patientNames]);

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

  return (
    <ThemeProvider theme={muiTheme}>
      <Box>
        <AssociatesFilters
          limit={limit}
          filter={filter}
          onFilterChange={setFilter}
          onReload={() => load()}
          onCreate={() => setCreateOpen(true)}
          rows={rows}
        />

        {loading ? (
          <Box sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CircularProgress size={28} sx={{ color: GREEN }} />
          </Box>
        ) : (
          <>
            <AssociatesTable
              rows={visible}
              localQ={localQ}
              onLocalQ={setLocalQ}
              onOpen={openUser}
              onSendTriage={sendTriage}
              patientNames={patientNames}
            />
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 3 }}>
              <Button
                variant="contained"
                startIcon={
                  loadingMore ? (
                    <CircularProgress size={18} sx={{ color: '#fff' }} />
                  ) : (
                    <KeyboardArrowDownIcon sx={{ color: '#fff' }} />
                  )
                }
                onClick={handleLoadMore}
                disabled={loadingMore}
                sx={{
                  bgcolor: GREEN,
                  color: '#fff',
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 2.5,
                  '&:hover': { bgcolor: '#4a684b' },
                }}
              >
                Carregar mais
              </Button>
            </Box>
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
            await load();
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

        {!loading && visible.length === 0 ? (
          <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">
            Nenhum associado encontrado.
          </Typography>
        ) : null}
      </Box>
    </ThemeProvider>
  );
}
