import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  LinearProgress,
  Radio,
  RadioGroup,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { createApiClient } from '@kunk/api-client';
import { getKunkPublicConfig } from '@kunk/config';
import { PATHS } from '../../app/menuConfig.js';

const muiTheme = createTheme();
const Z = 14000;
const BLACK = '#000000';
const PURPLE = '#7A5B7A';

const ENTITY_API = {
  associados: 'users',
  pedidos: 'orders',
  servicos: 'services',
  triagem: 'reception',
};

function formatDate(v) {
  if (!v) return '';
  try {
    return new Date(v).toLocaleDateString('pt-BR');
  } catch {
    return String(v);
  }
}

function displayNameTitleCase(str) {
  if (str == null) return '';
  return String(str)
    .trim()
    .toLocaleLowerCase('pt-BR')
    .split(' ')
    .map((w) => w.split('-').map((p) => (p ? p.charAt(0).toLocaleUpperCase('pt-BR') + p.slice(1) : p)).join('-'))
    .join(' ');
}

function openFullUrl(pathWithQuery) {
  const url = pathWithQuery.startsWith('http')
    ? pathWithQuery
    : `${window.location.origin}${pathWithQuery.startsWith('/') ? '' : '/'}${pathWithQuery}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function associadoNomeCell(row) {
  const blocks = Array.isArray(row.gs_meta?.display_name_blocks) ? row.gs_meta.display_name_blocks : [];
  if (blocks.length > 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {blocks.map((b, i) => (
          <Box key={i}>
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 11, color: BLACK }}>
              {b.label}
            </Typography>
            <Typography variant="body2" sx={{ color: BLACK }}>
              {b.name ? displayNameTitleCase(b.name) : '—'}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  }
  const name =
    row.fullname ||
    [row.associate_name, row.associate_last_name].filter(Boolean).join(' ') ||
    '';
  return (
    <Typography variant="body2" sx={{ color: BLACK }}>
      {name ? displayNameTitleCase(name) : '—'}
    </Typography>
  );
}

export default function GlobalAppSearch() {
  const bootstrap = getKunkPublicConfig();
  const api = useMemo(() => createApiClient({ baseUrl: bootstrap.apiUrl }), [bootstrap.apiUrl]);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('associados');
  const [ordersMode, setOrdersMode] = useState('name');
  const [qInput, setQInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);

  const runSearch = useCallback(
    async (opts = {}) => {
      const queryText = opts.q != null ? opts.q : qInput;
      const pageNum = opts.page != null ? opts.page : 1;
      if (!String(queryText).trim()) {
        setError('Informe um termo para pesquisar.');
        return;
      }
      setLoading(true);
      setError('');
      try {
        const res = await api.globalSearch({
          entity: ENTITY_API[tab],
          q: String(queryText).trim(),
          page: pageNum,
          limit: 100,
          ordersMode: tab === 'pedidos' ? ordersMode : undefined,
        });
        setRows(res.data || []);
        setMeta(res.meta || null);
        setPage(pageNum);
      } catch (e) {
        setError(e.message || 'Erro na pesquisa.');
        setRows([]);
        setMeta(null);
      } finally {
        setLoading(false);
      }
    },
    [api, qInput, tab, ordersMode]
  );

  async function sendTriage(row) {
    const code = row.gs_meta?.open_user_code || row.user_code;
    if (!code) return;
    try {
      const name = row.associate_name || row.fullname || 'Associado';
      await api.createReception({
        name: String(name).split(' ')[0] || 'Associado',
        last_name: row.associate_last_name || '',
        email: row.gs_meta?.display_email || row.email_account || row.email || null,
        phone: row.gs_meta?.display_phone || row.mobile_number || null,
        is_associate: true,
        associate_code: code,
        associate_name: name,
      });
      openFullUrl(PATHS.triage);
      setOpen(false);
    } catch (e) {
      setError(e.message || 'Falha ao criar triagem');
    }
  }

  function goRow(row) {
    if (tab === 'associados') {
      const code = row.gs_meta?.open_user_code || row.user_code;
      if (!code) return;
      openFullUrl(`${PATHS.registration}?a=${encodeURIComponent(code)}`);
      setOpen(false);
      return;
    }
    if (tab === 'servicos') {
      const nome = String(row.associate_name || '').replace(/\s+/g, ' ').trim();
      const hRaw = row.consultation_date || row.date_created || '';
      const h = hRaw ? encodeURIComponent(new Date(hRaw).toISOString()) : '';
      openFullUrl(`${PATHS.services}?s=${encodeURIComponent(nome)}${h ? `&h=${h}` : ''}`);
      setOpen(false);
      return;
    }
    if (tab === 'pedidos') {
      const code = row.order_code || row.id;
      if (!code) return;
      openFullUrl(`${PATHS.orders}?p=${encodeURIComponent(code)}`);
      setOpen(false);
      return;
    }
    if (tab === 'triagem' && row.code) {
      openFullUrl(`${PATHS.triage}?t=${encodeURIComponent(row.code)}`);
      setOpen(false);
    }
  }

  const titles = {
    associados: 'Buscar associados',
    pedidos: 'Buscar Pedidos',
    servicos: 'Buscar Serviços',
    triagem: 'Buscar Triagem',
  };

  const hints = {
    associados: 'Permitido pesquisar por nome, telefone e e-mail. Pacientes aparecem com o responsável.',
    pedidos:
      ordersMode === 'tracking'
        ? 'Pesquise pelo código de rastreamento.'
        : 'Pesquise pelo nome do associado no pedido.',
    servicos: 'Pesquise pelo nome do associado vinculado ao serviço.',
    triagem: 'Pesquise pelo nome ou sobrenome na triagem.',
  };

  const columns = useMemo(() => {
    if (tab === 'associados') {
      return [
        { label: 'Nome', render: (r) => associadoNomeCell(r) },
        { label: 'Status', render: (r) => r.gs_meta?.display_status ?? r.status ?? '' },
        { label: 'E-mail', render: (r) => r.gs_meta?.display_email ?? r.email_account ?? r.email ?? '' },
        { label: 'Telefone', render: (r) => r.gs_meta?.display_phone ?? r.mobile_number ?? '' },
        { label: 'Cadastro', render: (r) => formatDate(r.gs_meta?.display_created ?? r.created_date) },
      ];
    }
    if (tab === 'pedidos') {
      return [
        { label: 'Associado', render: (r) => displayNameTitleCase(r.associate_name || '') },
        { label: 'Rastreamento', render: (r) => r.tracking_code || '' },
        { label: 'Status', render: (r) => r.status || '' },
        { label: 'Criado', render: (r) => formatDate(r.created_date || r.date_created) },
      ];
    }
    if (tab === 'servicos') {
      return [
        { label: 'Associado', render: (r) => displayNameTitleCase(r.associate_name || '') },
        { label: 'Data', render: (r) => formatDate(r.consultation_date || r.date_created) },
        { label: 'Profissional', render: (r) => displayNameTitleCase(r.professional_name || '') },
      ];
    }
    return [
      {
        label: 'Nome',
        render: (r) => displayNameTitleCase([r.name, r.last_name].filter(Boolean).join(' ')),
      },
      { label: 'E-mail', render: (r) => r.email || '' },
      { label: 'Telefone', render: (r) => r.phone || '' },
      { label: 'Criado', render: (r) => formatDate(r.date_created) },
    ];
  }, [tab]);

  const totalPages =
    meta?.total != null && meta.total > 0 ? Math.ceil(meta.total / (meta.limit || 100)) : null;

  return (
    <ThemeProvider theme={muiTheme}>
      <Box
        sx={{
          position: 'fixed',
          top: 'calc(var(--Header-height, 0px) + 16px)',
          right: 54,
          zIndex: Z + 2,
        }}
      >
        <Button
          variant="contained"
          size="large"
          onClick={() => setOpen(true)}
          startIcon={<SearchIcon />}
          sx={{
            bgcolor: PURPLE,
            color: '#fff',
            boxShadow: 3,
            '&:hover': { bgcolor: '#6a4e6a' },
            borderRadius: 3,
            px: 2.5,
          }}
        >
          Pesquisar
        </Button>
      </Box>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="lg"
        fullWidth
        sx={{ zIndex: Z }}
        PaperProps={{ sx: { minHeight: '72vh', maxHeight: '94vh' } }}
      >
        <DialogTitle>{titles[tab]}</DialogTitle>
        <DialogContent dividers>
          {loading ? <LinearProgress sx={{ mb: 1 }} /> : null}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <FormControl sx={{ minWidth: 150 }}>
              <FormLabel sx={{ color: BLACK }}>Onde pesquisar</FormLabel>
              <RadioGroup
                value={tab}
                onChange={(e) => {
                  setTab(e.target.value);
                  setRows([]);
                  setMeta(null);
                }}
              >
                {['associados', 'pedidos', 'servicos', 'triagem'].map((k) => (
                  <FormControlLabel
                    key={k}
                    value={k}
                    control={<Radio />}
                    label={k.charAt(0).toUpperCase() + k.slice(1)}
                    sx={{ color: BLACK }}
                  />
                ))}
              </RadioGroup>
            </FormControl>

            <Box flex={1}>
              <Typography variant="body2" sx={{ mb: 1, color: BLACK }}>
                {hints[tab]}
              </Typography>
              {tab === 'pedidos' ? (
                <RadioGroup
                  row
                  value={ordersMode}
                  onChange={(e) => setOrdersMode(e.target.value)}
                  sx={{ mb: 1 }}
                >
                  <FormControlLabel value="name" control={<Radio />} label="Nome" />
                  <FormControlLabel value="tracking" control={<Radio />} label="Rastreamento" />
                </RadioGroup>
              ) : null}
              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth
                  size="small"
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') runSearch({ page: 1 });
                  }}
                  placeholder="Pesquisar..."
                />
                <Button
                  variant="contained"
                  onClick={() => runSearch({ page: 1 })}
                  disabled={loading}
                  sx={{ bgcolor: PURPLE }}
                >
                  Consultar
                </Button>
              </Stack>
              {error ? (
                <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                  {error}
                </Typography>
              ) : null}

              <TableContainer component={Paper} sx={{ mt: 2, maxHeight: '50vh' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {columns.map((c) => (
                        <TableCell key={c.label}>{c.label}</TableCell>
                      ))}
                      <TableCell>Abrir</TableCell>
                      {tab === 'associados' ? <TableCell>Triagem</TableCell> : null}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading && rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={columns.length + 2}>
                          <CircularProgress size={22} />
                        </TableCell>
                      </TableRow>
                    ) : null}
                    {rows.map((r) => (
                      <TableRow key={r.id || r.user_code || r.order_code || r.code} hover>
                        {columns.map((c) => (
                          <TableCell key={c.label}>{c.render(r)}</TableCell>
                        ))}
                        <TableCell>
                          <Button size="small" startIcon={<OpenInNewIcon />} onClick={() => goRow(r)}>
                            Abrir
                          </Button>
                        </TableCell>
                        {tab === 'associados' ? (
                          <TableCell>
                            <Button size="small" onClick={() => sendTriage(r)}>
                              Triagem
                            </Button>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {totalPages && totalPages > 1 ? (
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button disabled={page <= 1 || loading} onClick={() => runSearch({ page: page - 1, q: qInput })}>
                    Anterior
                  </Button>
                  <Typography variant="body2" sx={{ alignSelf: 'center' }}>
                    Página {page} / {totalPages}
                  </Typography>
                  <Button
                    disabled={page >= totalPages || loading}
                    onClick={() => runSearch({ page: page + 1, q: qInput })}
                  >
                    Próxima
                  </Button>
                </Stack>
              ) : null}
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>
    </ThemeProvider>
  );
}
