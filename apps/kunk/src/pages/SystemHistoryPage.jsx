import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
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
  CircularProgress,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { createApiClient } from '@kunk/api-client';
import { getKunkPublicConfig } from '@kunk/config';
import { PATHS } from '../app/menuConfig.js';

const materialTheme = createTheme({
  palette: {
    primary: { main: '#5a7a5b' },
    secondary: { main: '#7A5B7A' },
  },
});

const ACTION_OPTIONS = [
  { value: '', label: 'Todas as ações' },
  { value: 'reception.created', label: 'Triagem criada' },
  { value: 'reception.status_changed', label: 'Status alterado' },
  { value: 'reception.assumed', label: 'Assumiu contato' },
  { value: 'reception.transferred', label: 'Transferência' },
  { value: 'reception.attendant_cleared', label: 'Removeu atendente' },
  { value: 'reception.linked', label: 'Linkou associado' },
  { value: 'reception.unlinked', label: 'Desvinculou associado' },
  { value: 'reception.completed', label: 'Concluiu triagem' },
];

function formatWhen(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function pathForRow(row) {
  if (row.entity_type === 'reception' && row.entity_code) {
    return `${PATHS.triage}?t=${encodeURIComponent(row.entity_code)}`;
  }
  if (row.entity_type === 'reception') return PATHS.triage;
  return PATHS.systemHistory;
}

export default function SystemHistoryPage() {
  const navigate = useNavigate();
  const api = useMemo(() => {
    const bootstrap = getKunkPublicConfig();
    return createApiClient({ baseUrl: bootstrap.apiUrl });
  }, []);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '100', offset: '0' });
      if (action) params.set('action', action);
      if (actor.trim()) params.set('actor_user_code', actor.trim());
      const res = await api.listActivity(params.toString());
      setRows(res.data || []);
      setTotal(res.meta?.filter_count ?? (res.data || []).length);
    } catch (err) {
      setError(err.message || 'Falha ao carregar histórico');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [api, action, actor]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ThemeProvider theme={materialTheme}>
      <Box sx={{ width: '100%', mb: 2 }}>
        <Paper
          elevation={0}
          sx={{
            backgroundColor: '#f5f5f5',
            borderRadius: '30px',
            p: '20px 24px',
            mb: 2,
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <TextField
            select
            size="small"
            label="Ação"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            {ACTION_OPTIONS.map((opt) => (
              <MenuItem key={opt.value || 'all'} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Código do ator"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            sx={{ minWidth: 220 }}
          />
          <Button variant="contained" onClick={load} sx={{ bgcolor: '#7A5B7A', '&:hover': { bgcolor: '#4d2d4d' } }}>
            Filtrar
          </Button>
          <Typography variant="body2" sx={{ color: '#5a7a5b', fontWeight: 700 }}>
            {total} registro{total === 1 ? '' : 's'}
          </Typography>
        </Paper>

        {error ? (
          <Typography sx={{ color: '#b71c1c', mb: 1 }}>{error}</Typography>
        ) : null}

        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ backgroundColor: '#f5f5f5', borderRadius: '30px', overflow: 'hidden' }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#5a7a5b' }}>
                <TableCell sx={{ color: 'white' }}>Data / hora</TableCell>
                <TableCell sx={{ color: 'white' }}>Usuário</TableCell>
                <TableCell sx={{ color: 'white' }}>Ação</TableCell>
                <TableCell sx={{ color: 'white' }}>Entidade</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : null}
              {!loading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3, color: '#5a7a5b' }}>
                    Nenhuma ação registrada.
                  </TableCell>
                </TableRow>
              ) : null}
              {!loading && rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  hover
                  onClick={() => navigate(pathForRow(row))}
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: index % 2 === 0 ? '#e8ede9ab' : 'transparent',
                  }}
                >
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatWhen(row.date_created)}</TableCell>
                  <TableCell>{row.actor_name || '—'}</TableCell>
                  <TableCell>{row.summary}</TableCell>
                  <TableCell>
                    {row.entity_type}
                    {row.entity_code ? ` · ${String(row.entity_code).slice(0, 8)}…` : ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </ThemeProvider>
  );
}
