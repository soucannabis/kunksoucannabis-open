import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createApiClient } from '@kunk/api-client';
import { getKunkPublicConfig } from '@kunk/config';
import { useErrorModal } from '../../components/errors/ErrorModalProvider.jsx';
import { PATHS } from '../../app/menuConfig.js';
import InstitutionalFilters from './institutional/InstitutionalFilters.jsx';
import InstitutionalTable from './institutional/InstitutionalTable.jsx';
import CreateInstitutionalModal from './institutional/CreateInstitutionalModal.jsx';
import InstitutionalModal from './institutional/InstitutionalModal.jsx';
import {
  contactEmail,
  contactPhone,
  displayName,
  documentLabel,
  matchesFilter,
  statusLabel,
  typeLabel,
} from './institutional/institutionalStatus.js';

const muiTheme = createTheme();
const GREEN = '#5a7a5b';

export default function InstitutionalClientsPage() {
  const bootstrap = getKunkPublicConfig();
  const api = useMemo(() => createApiClient({ baseUrl: bootstrap.apiUrl }), [bootstrap.apiUrl]);
  const { showError } = useErrorModal();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [limit, setLimit] = useState(60);
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [localQ, setLocalQ] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const deepIc = searchParams.get('ic');
      if (deepIc) {
        const res = await api.getInstitutionalClientByCode(deepIc);
        const c = res.data;
        setRows(c ? [c] : []);
        setTotalCount(c ? 1 : 0);
        setSelected(c || null);
        return;
      }

      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('sort', '-date_created');
      params.set('meta', 'filter_count');
      const res = await api.listInstitutionalClients(params.toString());
      setRows(res.data || []);
      const metaCount = res.meta?.filter_count;
      setTotalCount(typeof metaCount === 'number' ? metaCount : (res.data || []).length);
    } catch (err) {
      showError(err.message || 'Falha ao carregar clientes institucionais');
      setRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [api, limit, searchParams, showError]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    let list = rows.filter((c) => matchesFilter(c, filter));
    const q = localQ
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .trim();
    if (q) {
      list = list.filter((c) => {
        const blob = [
          displayName(c),
          contactEmail(c),
          contactPhone(c),
          documentLabel(c),
          typeLabel(c),
          statusLabel(c),
          c.representative_name,
          c.company_name,
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
  }, [rows, filter, localQ]);

  function openClient(c) {
    setSelected(c);
    if (c?.client_code) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('ic', c.client_code);
        return next;
      });
    }
  }

  function closeModal() {
    setSelected(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('ic');
      return next;
    });
  }

  function goNewOrder(c) {
    if (!c?.client_code) return;
    navigate(`${PATHS.newOrder}?ic=${encodeURIComponent(c.client_code)}`);
  }

  return (
    <ThemeProvider theme={muiTheme}>
      <Box>
        <InstitutionalFilters
          shownCount={visible.length}
          totalCount={filter || localQ.trim() ? visible.length : totalCount}
          filter={filter}
          onFilterChange={setFilter}
          onReload={load}
          onCreate={() => setCreateOpen(true)}
          localQ={localQ}
          onLocalQ={setLocalQ}
        />

        {loading ? (
          <CircularProgress size={28} sx={{ color: GREEN }} />
        ) : (
          <>
            <InstitutionalTable rows={visible} onOpen={openClient} />
            {!searchParams.get('ic') && totalCount != null && rows.length < totalCount ? (
              <Button sx={{ mt: 1 }} onClick={() => setLimit((n) => n + 60)}>
                Carregar mais
              </Button>
            ) : null}
          </>
        )}

        <CreateInstitutionalModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          api={api}
          onCreated={async (data) => {
            await load();
            if (data) openClient(data);
          }}
        />

        <InstitutionalModal
          open={Boolean(selected)}
          client={selected}
          api={api}
          onClose={closeModal}
          onChanged={load}
          onNewOrder={goNewOrder}
        />

        {!loading && visible.length === 0 ? (
          <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">
            Nenhum cliente institucional encontrado.
          </Typography>
        ) : null}
      </Box>
    </ThemeProvider>
  );
}
